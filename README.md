git remote add origin https://github.com/Anacyre/TMJC_26S201.git
git branch -M main
git push -u origin main

git add package.json package-lock.json
git commit -m "revert vite to 5.2.8 for uni-app compatibility"
git push

git add package.json package-lock.json wrangler.jsonc
git commit -m "revert vite to 5.2.8 and add wrangler config"
git push