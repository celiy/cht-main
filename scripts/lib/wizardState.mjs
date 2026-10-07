export const NA_OPTION = {
    id: "na",
    label: "N/A",
    hint: "Não selecionar nenhuma"
};

export const UNMARK_OPTION = {
    id: "na",
    label: "N/A",
    hint: "Desmarcar esta opção"
};

export const CONTINUE_OPTION = {
    id: "continue",
    label: "Continuar",
    hint: "Seguir para a próxima pergunta"
};

export const FLAVORS = [
    {
        id: "new",
        label: "New",
        hint: "Irá criar um arquivo-base vazio para configuração"
    },
    {
        id: "opinionated",
        label: "Project-Opinionated",
        hint: "Irá instalar as configurações usadas no desenvolvimento base do projeto"
    }
];

export const AI_FLAVORS = [UNMARK_OPTION, ...FLAVORS];

export const WIZARD_STEPS = [
    {
        id: "ide",
        question: "Qual IDE você utiliza?",
        options: [
            NA_OPTION,
            { id: "vscode", label: "VS Code" }
        ],
        flavors: "always"
    },
    {
        id: "prettier",
        question: "Instalar Prettier?",
        options: [
            { id: "no", label: "Não" },
            { id: "yes", label: "Sim" }
        ],
        flavors: "yes"
    },
    {
        id: "eslint",
        question: "Instalar ESLint?",
        options: [
            { id: "no", label: "Não" },
            { id: "yes", label: "Sim" }
        ],
        flavors: "yes"
    },
    {
        id: "vps",
        question: "Configuração de VPS?",
        options: [
            NA_OPTION,
            { id: "netlify", label: "Netlify" }
        ],
        flavors: "always"
    },
    {
        id: "ai",
        question: "Quais estruturas de docs de IA?",
        vertical: true,
        multi: true,
        options: [
            { id: "cursor", label: ".cursor" },
            { id: "claude", label: ".claude" },
            { id: "copilot", label: ".github (Copilot)" },
            CONTINUE_OPTION
        ],
        flavors: "toggle"
    },
    {
        id: "save",
        question: "Salvar esta configuração num cliente?",
        options: [
            { id: "no", label: "Não" },
            { id: "yes", label: "Sim" }
        ],
        flavors: "targets"
    }
];

/**
 * @param {string[]} [saveTargets]
 */
export function createDraft(saveTargets = []) {
    const targets = saveTargets.map((id) => ({ id, label: id }));

    return {
        step: 0,
        lane: "primary",
        primaryIdx: 0,
        flavorIdx: 0,
        flavorsOpen: false,
        saveTargets: targets,
        done: false,
        cancel: false,
        values: {
            ide: "none",
            ideFlavor: "new",
            prettier: false,
            prettierFlavor: "new",
            eslint: false,
            eslintFlavor: "new",
            vps: false,
            vpsFlavor: "new",
            ai: [],
            aiFlavor: { cursor: "new", claude: "new", copilot: "new" },
            save: false,
            saveAs: targets[0]?.id ?? "devApp"
        }
    };
}

export function currentStep(draft) {
    return WIZARD_STEPS[draft.step];
}

function focusedOption(draft) {
    const step = currentStep(draft);

    return step.options[draft.primaryIdx];
}

function flavorsForFocused(draft) {
    const step = currentStep(draft);
    const option = focusedOption(draft);

    if (!option) {
        return [];
    }

    if (step.flavors === "toggle" && option.id !== "continue") {
        return AI_FLAVORS;
    }

    if (step.flavors === "always" && option.id !== "na") {
        return FLAVORS;
    }

    if (step.flavors === "yes" && option.id === "yes") {
        return FLAVORS;
    }

    if (step.flavors === "selected" && draft.values.ai.includes(option.id)) {
        return FLAVORS;
    }

    if (step.flavors === "targets" && option.id === "yes") {
        return draft.saveTargets;
    }

    return [];
}

export function flavorOptions(draft) {
    if (!draft.flavorsOpen) {
        return [];
    }

    return flavorsForFocused(draft);
}

export function focusedFlavorHint(draft) {
    if (draft.lane !== "flavor") {
        return "";
    }

    const flavor = flavorOptions(draft)[draft.flavorIdx];

    return flavor?.hint || "";
}

export function focusedHint(draft) {
    if (draft.lane === "flavor") {
        return focusedFlavorHint(draft);
    }

    return focusedOption(draft)?.hint || "";
}

export function stepQuestion(draft) {
    return currentStep(draft).question;
}

function flavorLabel(id) {
    return FLAVORS.find((flavor) => flavor.id === id)?.label ?? id ?? "N/A";
}

export function formatSelectionLine(draft) {
    const values = draft.values;
    const parts = [];

    if (draft.step > 0) {
        const ide = values.ide === "vscode"
            ? `VS Code · ${flavorLabel(values.ideFlavor)}`
            : "N/A";

        parts.push(`IDE: ${ide}`);
    }

    if (draft.step > 1) {
        const prettier = values.prettier
            ? `Sim · ${flavorLabel(values.prettierFlavor)}`
            : "Não";

        parts.push(`Prettier: ${prettier}`);
    }

    if (draft.step > 2) {
        const eslint = values.eslint
            ? `Sim · ${flavorLabel(values.eslintFlavor)}`
            : "Não";

        parts.push(`ESLint: ${eslint}`);
    }

    if (draft.step > 3) {
        const vps = values.vps
            ? `Netlify · ${flavorLabel(values.vpsFlavor)}`
            : "N/A";

        parts.push(`VPS: ${vps}`);
    }

    if (draft.step > 4 || (draft.step === 4 && values.ai.length > 0)) {
        const aiStep = WIZARD_STEPS.find((step) => step.id === "ai");
        const ai = values.ai.length
            ? values.ai
                .map((id) => {
                    const label = aiStep?.options.find((option) => option.id === id)?.label ?? id;

                    return `${label} · ${flavorLabel(values.aiFlavor[id])}`;
                })
                .join(", ")
            : "N/A";

        parts.push(`IA: ${ai}`);
    }

    if (draft.step > 5) {
        parts.push(`Guardar: ${values.save ? values.saveAs : "Não"}`);
    }

    return parts.join("  ·  ");
}

function clampLane(draft) {
    const flavors = flavorOptions(draft);

    if (draft.lane === "flavor" && flavors.length === 0) {
        draft.lane = "primary";
        draft.flavorIdx = 0;
    }

    if (draft.primaryIdx >= currentStep(draft).options.length) {
        draft.primaryIdx = 0;
    }

    if (draft.flavorIdx >= flavors.length) {
        draft.flavorIdx = 0;
    }

    return draft;
}

function commitLane(draft) {
    const step = currentStep(draft);
    const option = focusedOption(draft);
    const flavors = flavorOptions(draft);
    const flavor = flavors[draft.flavorIdx];

    if (step.id === "ide") {
        draft.values.ide = option.id === "na" ? "none" : option.id;

        if (flavor) {
            draft.values.ideFlavor = flavor.id;
        }
    }

    if (step.id === "prettier") {
        draft.values.prettier = option.id === "yes";

        if (option.id === "yes" && flavor) {
            draft.values.prettierFlavor = flavor.id;
        }
    }

    if (step.id === "eslint") {
        draft.values.eslint = option.id === "yes";

        if (option.id === "yes" && flavor) {
            draft.values.eslintFlavor = flavor.id;
        }
    }

    if (step.id === "vps") {
        draft.values.vps = option.id === "netlify";

        if (flavor) {
            draft.values.vpsFlavor = flavor.id;
        }
    }

    if (step.id === "ai") {
        if (!option || option.id === "continue") {
            return draft;
        }

        if (!flavor || flavor.id === "na") {
            draft.values.ai = draft.values.ai.filter((id) => id !== option.id);

            return draft;
        }

        if (!draft.values.ai.includes(option.id)) {
            draft.values.ai = [...draft.values.ai, option.id];
        }

        draft.values.aiFlavor = { ...draft.values.aiFlavor, [option.id]: flavor.id };
    }

    if (step.id === "save") {
        draft.values.save = option.id === "yes";

        if (option.id === "yes" && flavor) {
            draft.values.saveAs = flavor.id;
        }
    }

    return draft;
}

function goNext(draft) {
    commitLane(draft);

    if (draft.step >= WIZARD_STEPS.length - 1) {
        draft.done = true;

        return draft;
    }

    draft.step += 1;
    draft.lane = "primary";
    draft.primaryIdx = 0;
    draft.flavorIdx = 0;
    draft.flavorsOpen = false;

    return clampLane(draft);
}

/**
 * @param {object} draft
 * @param {"left"|"right"|"enter"|"space"|"back"|"quit"} action
 */
export function reduceWizard(draft, action) {
    const next = {
        ...draft,
        values: {
            ...draft.values,
            ai: [...draft.values.ai],
            aiFlavor: { ...draft.values.aiFlavor }
        },
        saveTargets: draft.saveTargets
    };

    if (next.done || next.cancel) {
        return next;
    }

    const step = currentStep(next);
    const flavors = flavorOptions(next);

    if (action === "quit") {
        next.cancel = true;

        return next;
    }

    if (action === "back") {
        if (next.lane === "flavor" || next.flavorsOpen) {
            next.lane = "primary";
            next.flavorsOpen = false;
            next.flavorIdx = 0;

            return next;
        }

        if (next.step > 0) {
            next.step -= 1;
            next.lane = "primary";
            next.primaryIdx = 0;
            next.flavorIdx = 0;
            next.flavorsOpen = false;
        }

        return clampLane(next);
    }

    if (action === "enter") {
        if (next.lane === "primary") {
            if (flavorsForFocused(next).length > 0) {
                next.flavorsOpen = true;
                next.lane = "flavor";
                next.flavorIdx = 0;

                const option = focusedOption(next);
                const openFlavors = flavorsForFocused(next);

                if (step.multi && option && next.values.ai.includes(option.id)) {
                    const current = next.values.aiFlavor[option.id];
                    const idx = openFlavors.findIndex((item) => item.id === current);

                    if (idx >= 0) {
                        next.flavorIdx = idx;
                    }
                }

                return next;
            }

            return goNext(next);
        }

        if (step.multi) {
            commitLane(next);
            next.lane = "primary";
            next.flavorsOpen = false;
            next.flavorIdx = 0;

            return next;
        }

        return goNext(next);
    }

    if (action === "right") {
        if (next.lane === "primary") {
            if (next.primaryIdx < step.options.length - 1) {
                next.primaryIdx += 1;
                next.flavorIdx = 0;
                next.flavorsOpen = false;

                return clampLane(next);
            }

            return next;
        }

        if (next.flavorIdx < flavors.length - 1) {
            next.flavorIdx += 1;
        }

        return next;
    }

    if (action === "left") {
        if (next.lane === "flavor") {
            if (next.flavorIdx > 0) {
                next.flavorIdx -= 1;

                return next;
            }

            next.lane = "primary";
            next.flavorsOpen = false;

            return next;
        }

        if (next.primaryIdx > 0) {
            next.primaryIdx -= 1;
            next.flavorIdx = 0;
            next.flavorsOpen = false;
        }

        return clampLane(next);
    }

    return next;
}

/**
 * @param {object} draft
 */
export function toWorkspaceChoices(draft) {
    return {
        ide: draft.values.ide,
        ideFlavor: draft.values.ideFlavor,
        prettier: draft.values.prettier,
        prettierFlavor: draft.values.prettierFlavor,
        eslint: draft.values.eslint,
        eslintFlavor: draft.values.eslintFlavor,
        vps: draft.values.vps,
        vpsFlavor: draft.values.vpsFlavor,
        ai: draft.values.ai,
        aiFlavors: draft.values.aiFlavor,
        saveAs: draft.values.save ? draft.values.saveAs : null
    };
}
