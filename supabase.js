const {createClient}=require('@supabase/supabase-js');
function env(){const url=process.env.SUPABASE_URL,secret=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!secret)throw Object.assign(new Error('Supabase server environment variables are not configured'),{status:500});return {url,secret}}
function service(){const e=env();return createClient(e.url,e.secret,{auth:{persistSession:false,autoRefreshToken:false}})}
function replyError(res,e){res.status(e.status||500).json({error:e.message||'Server error'})}
module.exports={env,service,replyError};
