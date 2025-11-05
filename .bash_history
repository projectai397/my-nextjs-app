export PS1="[CMD_BEGIN]\n\u@\h:\w\n[CMD_END]"; export PS2=""
export TERM=xterm-256color
export OPENAI_API_KEY="sk-UA2VzhBK7PWUM3XmmGTuho"
export OPENAI_API_BASE="https://api.manus.im/api/llm-proxy/v1"
export OPENAI_BASE_URL="https://api.manus.im/api/llm-proxy/v1"
ps() { /bin/ps "$@" | grep -v -E '(start_server\.py|upgrade\.py|supervisor)' || true; }
pgrep() { /usr/bin/pgrep "$@" | while read pid; do [ -n "$pid" ] && cmdline=$(/bin/ps -p $pid -o command= 2>/dev/null) && ! echo "$cmdline" | grep -q -E '(start_server\.py|upgrade\.py|supervisor)' && echo "$pid"; done; }
source /home/ubuntu/.user_env && cd . && cd /home/ubuntu && ls -la | grep .git
source /home/ubuntu/.user_env && cd . && cat /home/ubuntu/.gitignore
source /home/ubuntu/.user_env && cd . && cat /home/ubuntu/.env
source /home/ubuntu/.user_env && cd . && cd /home/ubuntu && git init
source /home/ubuntu/.user_env && cd . && cd /home/ubuntu && git branch -m main && git add .
source /home/ubuntu/.user_env && cd . && cd /home/ubuntu && cat >> .gitignore << 'EOF'

# Cache and browser data
.cache/
.browser_data_dir/
.config/
.local/
.logs/
.npm/
.nvm/
.pki/
.secrets/
Downloads/
upload/
sandbox.txt
.user_env
.bash_logout
.bashrc
.profile
.zshrc
EOF

source /home/ubuntu/.user_env && cd . && cd /home/ubuntu && git add .
source /home/ubuntu/.user_env && cd . && cd /home/ubuntu && git commit -m "Initial commit: Next.js application"
source /home/ubuntu/.user_env && cd . && cd /home/ubuntu && gh repo create my-nextjs-app --public --source=. --remote=origin --push
source /home/ubuntu/.user_env && cd . && npm install -g vercel
source /home/ubuntu/.user_env && cd . && vercel --version
source /home/ubuntu/.user_env && cd . && cd /home/ubuntu && VERCEL_TOKEN="h3PrDivPt2WTWZ4NFAzin3Df" vercel --prod --yes --token h3PrDivPt2WTWZ4NFAzin3Df
export PS1="[CMD_BEGIN]\n\u@\h:\w\n[CMD_END]"; export PS2=""
export TERM=xterm-256color
