const {spawnSync}=require('node:child_process');
for(const file of ['tests/team-studio.test.cjs','tests/adventure-ui.test.cjs','tests/circuit-ui.test.cjs']){const result=spawnSync(process.execPath,[file],{stdio:'inherit',env:{...process.env,STUDIO_SCREENSHOTS:process.env.STUDIO_SCREENSHOTS||'/tmp/ua-legacy-screenshots'}});if(result.status!==0)process.exit(result.status||1);}
