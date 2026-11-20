const express=require('express'),Database=require('better-sqlite3'),crypto=require('crypto'),path=require('path');
const db=new Database(process.env.DB_FILE||path.join(__dirname,'krithvi.db'));db.pragma('journal_mode=WAL');
db.exec(`create table if not exists users(id integer primary key,u text unique,h text,role text);
create table if not exists sessions(t text primary key,uid integer,exp integer);
create table if not exists kv(k text primary key,v text);
create table if not exists bills(id text primary key,j text,upd integer)`);
const app=express();app.set('trust proxy',1);app.use(express.json({limit:'2mb'}));
app.use((q,s,n)=>{s.set({'X-Frame-Options':'DENY','X-Content-Type-Options':'nosniff'});n()});
const hash=p=>{const s=crypto.randomBytes(16).toString('hex');return s+':'+crypto.scryptSync(p,s,64).toString('hex')},
ok=(p,h)=>{const[s,x]=h.split(':');return crypto.timingSafeEqual(Buffer.from(x,'hex'),crypto.scryptSync(p,s,64))},
cookie=q=>Object.fromEntries((q.headers.cookie||'').split(';').filter(Boolean).map(c=>c.trim().split('='))),
begin=(s,uid)=>{const t=crypto.randomBytes(32).toString('hex');db.prepare('delete from sessions where exp<?').run(Date.now());db.prepare('insert into sessions values(?,?,?)').run(t,uid,Date.now()+30*864e5);
s.setHeader('Set-Cookie',`kt=${t}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000${process.env.NODE_ENV=='production'?'; Secure':''}`)},
auth=role=>(q,s,n)=>{const t=cookie(q).kt,r=t&&db.prepare('select u.id,u.u,u.role from sessions x join users u on u.id=x.uid where x.t=? and x.exp>?').get(t,Date.now());
if(!r)return s.status(401).json({error:'Please sign in'});if(role&&r.role!=role)return s.status(403).json({error:'Owner only'});q.me=r;n()},
getCfg=()=>{const r=db.prepare("select v from kv where k='cfg'").get();return r&&JSON.parse(r.v)},setCfg=c=>db.prepare("insert or replace into kv values('cfg',?)").run(JSON.stringify(c)),
hasUsers=()=>!!db.prepare('select 1 from users').get(),bad={},E=(s,c,m)=>s.status(c).json({error:m});
app.get('/api/state',(q,s)=>s.json({setup:!hasUsers()}));
app.post('/api/setup',(q,s)=>{if(hasUsers())return E(s,403,'Already set up');const{u,p}=q.body||{};if(!u||!p||p.length<8)return E(s,400,'Username and a password of 8+ characters are required');
begin(s,db.prepare('insert into users(u,h,role) values(?,?,?)').run(u,hash(p),'owner').lastInsertRowid);s.json({ok:1})});
app.post('/api/login',(q,s)=>{const b=bad[q.ip]||0;if(b>=10)return E(s,429,'Too many attempts. Try again in 15 minutes.');const{u,p}=q.body||{},r=db.prepare('select * from users where u=?').get(u||'');
if(!r||!ok(p||'',r.h)){bad[q.ip]=b+1;setTimeout(()=>delete bad[q.ip],9e5);return E(s,401,'Wrong username or password')}delete bad[q.ip];begin(s,r.id);s.json({ok:1})});
app.post('/api/logout',(q,s)=>{const t=cookie(q).kt;if(t)db.prepare('delete from sessions where t=?').run(t);s.json({ok:1})});
app.get('/api/all',auth(),(q,s)=>s.json({me:q.me,cfg:getCfg(),bills:db.prepare('select j from bills').all().map(r=>JSON.parse(r.j))}));
app.put('/api/cfg',auth(),(q,s)=>{const old=getCfg(),n=q.body;if(!n||!n.s)return E(s,400,'Bad data');if(!old&&q.me.role!='owner')return E(s,403,'Owner must save settings first');
if(old){const un=(a,b,k)=>[...new Map([...(a||[]),...(b||[])].map(x=>[x[k],x])).values()];n.cust=un(old.cust,n.cust,'cn');n.items=un(old.items,n.items,'desc');
if(q.me.role!='owner')n.s=old.s;else{n.s.ni=Math.max(+n.s.ni||0,old.s.ni);n.s.nq=Math.max(+n.s.nq||0,old.s.nq)}}setCfg(n);s.json({ok:1})});
app.post('/api/seq/:t',auth(),(q,s)=>{const c=getCfg();if(!c)return E(s,400,'Settings not saved yet');const k=q.params.t=='q'?'nq':'ni',used=c.s[k];c.s[k]++;setCfg(c);s.json({used,ni:c.s.ni,nq:c.s.nq})});
app.put('/api/bills/:id',auth(),(q,s)=>{const d=q.body;if(!d||d.id!=q.params.id)return E(s,400,'Bad data');d.by=d.by||q.me.u;db.prepare('insert or replace into bills values(?,?,?)').run(d.id,JSON.stringify(d),Date.now());s.json({ok:1})});
app.delete('/api/bills/:id',auth('owner'),(q,s)=>{db.prepare('delete from bills where id=?').run(q.params.id);s.json({ok:1})});
app.get('/api/users',auth('owner'),(q,s)=>s.json(db.prepare('select id,u,role from users').all()));
app.post('/api/users',auth('owner'),(q,s)=>{const{u,p,role}=q.body||{};if(!u||!p||p.length<8)return E(s,400,'Username and a password of 8+ characters are required');
try{db.prepare('insert into users(u,h,role) values(?,?,?)').run(u,hash(p),role=='owner'?'owner':'staff');s.json({ok:1})}catch{E(s,400,'Username already exists')}});
app.delete('/api/users/:id',auth('owner'),(q,s)=>{if(+q.params.id==q.me.id)return E(s,400,'You cannot remove yourself');db.prepare('delete from sessions where uid=?').run(q.params.id);db.prepare('delete from users where id=?').run(q.params.id);s.json({ok:1})});
app.use(express.static(path.join(__dirname,'public')));
app.listen(process.env.PORT||3000,()=>console.log('Krithvi Billing running'));
