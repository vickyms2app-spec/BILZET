const {clear}=require('../lib/admin-session');module.exports=(req,res)=>{if(req.method!=='POST')return res.status(405).json({error:'POST only'});clear(res);res.status(200).json({ok:true})};
