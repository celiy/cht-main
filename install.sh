# Parse flags
INCLUDE_CLIENT_MECARVIT=false
for arg in "$@"; do
  if [ "$arg" = "--client:mecarvit" ]; then
    INCLUDE_CLIENT_MECARVIT=true
  fi
done

# Always clone these repositories
git clone https://github.com/celiy/cht-base.git || true
git clone https://github.com/celiy/cht-design-system.git || true
git clone https://github.com/celiy/cht-shared.git || true

# Conditionally clone these repositories if --client:mecarvit flag is set
if [ "$INCLUDE_CLIENT_MECARVIT" = true ]; then
  git clone https://github.com/celiy/cht-client-mecarvit.git || true
  git clone https://github.com/celiy/cht-backend-mecarvit.git || true
fi

for dir in */ ; do
  if [ -f "$dir/package.json" ]; then
    echo "Installing dependencies in $dir"
    cd "$dir"
    npm i
    cd ..
  fi
done