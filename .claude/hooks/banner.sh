#!/usr/bin/env bash
# Cosmetic: TMS9918-coloured banner when a subagent starts. Never blocks (always exit 0).
agent=$(node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);console.log(j.agent_type||j.agent_name||'agent')}catch{console.log('agent')}})")

case "$agent" in
  data-agent)     r=101; g=219; b=239 ;; # cyan       #65DBEF
  analyst-agent)  r=222; g=208; b=135 ;; # lt yellow  #DED087
  builder-agent)  r=62;  g=184; b=73  ;; # med green  #3EB849
  reviewer-agent) r=183; g=102; b=181 ;; # magenta    #B766B5
  *)              r=204; g=204; b=204 ;; # gray       #CCCCCC
esac

printf "\e[38;2;%d;%d;%dm" "$r" "$g" "$b"
printf '%s\n' \
  "▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄" \
  "█ GTCB ▶ ${agent} █" \
  "▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀"
printf "\e[0m"
exit 0