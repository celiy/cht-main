import {
    createDraft,
    flavorOptions,
    focusedHint,
    formatSelectionLine,
    reduceWizard,
    toWorkspaceChoices
} from "./wizardState.mjs";

function assert(cond, label) {
    if (!cond) {
        throw new Error(label);
    }
}

let draft = createDraft(["devApp", "mecarvit"]);

assert(draft.primaryIdx === 0, "na is preselected");
assert(flavorOptions(draft).length === 0, "ide hides flavors until enter");
assert(focusedHint(draft).includes("Não selecionar nenhuma"), "na hint on ide");
assert(formatSelectionLine(draft) === "", "summary empty until a step is passed");

draft = reduceWizard(draft, "enter");
assert(draft.step === 1 && draft.values.ide === "none", "enter on na skips flavors");
assert(formatSelectionLine(draft) === "IDE: N/A", "summary shows ide after pass");
assert(!formatSelectionLine(draft).includes("Prettier"), "later steps stay hidden");

draft = createDraft(["devApp", "mecarvit"]);
draft = reduceWizard(draft, "right");
assert(draft.primaryIdx === 1, "right focuses vscode");

draft = reduceWizard(draft, "enter");
assert(draft.lane === "flavor" && draft.flavorsOpen, "enter on vscode opens flavors");
assert(flavorOptions(draft).length === 2, "flavors after enter");
assert(focusedHint(draft).includes("arquivo-base vazio"), "new hint");
assert(formatSelectionLine(draft) === "", "flavors do not count as passing the step");

draft = reduceWizard(draft, "right");
assert(draft.flavorIdx === 1, "right moves flavor");
assert(focusedHint(draft).includes("desenvolvimento base"), "opinionated hint");

draft = reduceWizard(draft, "enter");
assert(draft.step === 1, "enter on flavor advances");
assert(draft.values.ideFlavor === "opinionated", "ide flavor stored");
assert(draft.primaryIdx === 0, "nao is preselected on prettier");
assert(formatSelectionLine(draft).includes("VS Code · Project-Opinionated"), "summary ide");
assert(flavorOptions(draft).length === 0, "next step starts without flavors");

draft = reduceWizard(draft, "back");
assert(draft.step === 0, "back returns to ide");
assert(formatSelectionLine(draft) === "", "back hides uncommitted later steps");

draft = reduceWizard(draft, "right");
draft = reduceWizard(draft, "enter");
draft = reduceWizard(draft, "enter");
assert(draft.step === 1, "ide skipped again");

draft = reduceWizard(draft, "right");
assert(flavorOptions(draft).length === 0, "sim does not show flavors until enter");

draft = reduceWizard(draft, "enter");
assert(flavorOptions(draft).length === 2, "enter on sim opens flavors");

draft = reduceWizard(draft, "enter");
assert(draft.step === 2 && draft.values.prettier === true, "prettier on");
assert(draft.primaryIdx === 0, "nao is preselected on eslint");
assert(formatSelectionLine(draft).includes("Prettier: Sim"), "summary prettier after pass");
assert(!formatSelectionLine(draft).includes("ESLint"), "eslint hidden until passed");

draft = reduceWizard(draft, "enter");
assert(draft.step === 3 && draft.values.eslint === false, "eslint skip");
assert(formatSelectionLine(draft).includes("ESLint: Não"), "summary eslint after pass");
assert(draft.primaryIdx === 0, "na is preselected on vps");

draft = reduceWizard(draft, "enter");
assert(draft.step === 4 && draft.values.vps === false, "vps na");
assert(formatSelectionLine(draft).includes("VPS: N/A"), "summary vps na");
assert(!formatSelectionLine(draft).includes("IA:"), "ai hidden until passed");

draft = reduceWizard(draft, "enter");
assert(draft.step === 4, "still on ai");
assert(draft.lane === "flavor", "enter on cursor opens flavors");
assert(flavorOptions(draft).length === 3, "ai flavors include na");
assert(flavorOptions(draft)[0].id === "na", "na is first ai flavor");
assert(focusedHint(draft).includes("Desmarcar"), "unmark hint");
assert(!draft.values.ai.includes("cursor"), "na preselect does not mark yet");

draft = reduceWizard(draft, "right");
draft = reduceWizard(draft, "enter");
assert(draft.step === 4, "flavor commit stays on ai");
assert(draft.lane === "primary", "returns to list");
assert(draft.values.ai.includes("cursor"), "cursor marked");
assert(draft.values.aiFlavor.cursor === "new", "cursor flavor stored");
assert(formatSelectionLine(draft).includes(".cursor"), "marked ai appears");
assert(!formatSelectionLine(draft).includes(".claude"), "unmarked ai stays hidden");

draft = reduceWizard(draft, "enter");
assert(draft.flavorIdx === 1, "reopen focuses current flavor");

draft = reduceWizard(draft, "left");
draft = reduceWizard(draft, "enter");
assert(!draft.values.ai.includes("cursor"), "na unmarks");
assert(!formatSelectionLine(draft).includes(".cursor"), "unmarked leaves summary");

draft = reduceWizard(draft, "enter");
draft = reduceWizard(draft, "right");
draft = reduceWizard(draft, "enter");
draft = reduceWizard(draft, "right");
draft = reduceWizard(draft, "enter");
draft = reduceWizard(draft, "right");
draft = reduceWizard(draft, "right");
draft = reduceWizard(draft, "enter");
assert(draft.values.ai.includes("claude"), "claude marked");
assert(draft.values.aiFlavor.claude === "opinionated", "claude flavor stored");

draft = reduceWizard(draft, "right");
draft = reduceWizard(draft, "right");
assert(draft.primaryIdx === 3, "continue focused");

draft = reduceWizard(draft, "enter");
assert(draft.step === 5, "continue advances to save");
assert(draft.primaryIdx === 0, "nao is preselected on save");
assert(
    formatSelectionLine(draft).includes(".cursor") && formatSelectionLine(draft).includes(".claude"),
    "summary lists both ais"
);
assert(!formatSelectionLine(draft).includes("Guardar"), "save hidden until passed");
assert(!formatSelectionLine(draft).includes("\n"), "summary is one line");

const choices = toWorkspaceChoices(reduceWizard(draft, "enter"));

assert(choices.saveAs === null, "save no");
assert(choices.ai.includes("cursor") && choices.ai.includes("claude"), "multi ai in choices");

const quit = reduceWizard(createDraft(["devApp"]), "quit");

assert(quit.cancel, "q cancels");

console.log("wizardState ok");
