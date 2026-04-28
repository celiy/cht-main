for dir in */ ; do
  if [ -f "$dir/package.json" ]; then
    echo "Installing dependencies in $dir"
    cd "$dir"
    npm i
    cd ..
  fi
done