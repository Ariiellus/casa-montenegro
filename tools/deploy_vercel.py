import hashlib, json, os, sys, time, urllib.request, urllib.error
T = os.environ["VERCEL_TOKEN"]; ROOT = os.path.expanduser("~/repos/misterio"); NAME = "casa-montenegro"
def api(method, path, body=None, headers=None, raw=None):
    h = {"Authorization": f"Bearer {T}"}; h.update(headers or {})
    data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
    if body is not None: h["Content-Type"] = "application/json"
    r = urllib.request.Request("https://api.vercel.com" + path, data=data, method=method, headers=h)
    try:
        with urllib.request.urlopen(r) as resp: return resp.status, json.loads(resp.read() or b"{}")
    except urllib.error.HTTPError as e: return e.code, json.loads(e.read() or b"{}")
st, u = api("GET", "/v2/user"); print("user", st, u.get("user", {}).get("username"))
st, p = api("GET", f"/v9/projects/{NAME}")
if st == 404:
    st, p = api("POST", "/v10/projects", {"name": NAME, "framework": None}); print("create project", st, p.get("error"))
print("project", st, p.get("id"))
envf = os.path.join(ROOT, ".env")
if os.path.exists(envf):
    for line in open(envf):
        k, _, v = line.strip().partition("=")
        if k in ("SUPABASE_URL", "SUPABASE_ANON_KEY") and v:
            s_, r_ = api("POST", f"/v10/projects/{NAME}/env?upsert=true", {"key": k, "value": v, "type": "encrypted", "target": ["production", "preview", "development"]})
            print("env", k, s_)
files = []
for d, dirs, fs in os.walk(ROOT):
    dirs[:] = [x for x in dirs if x not in (".git", "tools", "__pycache__", ".vercel")]
    for f in fs:
        if f.startswith((".env", ".git")): continue
        full = os.path.join(d, f); rel = os.path.relpath(full, ROOT); b = open(full, "rb").read(); sha = hashlib.sha1(b).hexdigest()
        s, r = api("POST", "/v2/files", headers={"x-vercel-digest": sha, "Content-Type": "application/octet-stream", "Content-Length": str(len(b))}, raw=b)
        if s != 200: print("upload fail", rel, s, r); sys.exit(1)
        files.append({"file": rel, "sha": sha, "size": len(b)})
print("uploaded", len(files))
st, dep = api("POST", "/v13/deployments", {"name": NAME, "project": NAME, "target": "production", "files": files, "projectSettings": {"framework": None}})
print("deploy", st, dep.get("id"), dep.get("error"))
for _ in range(60):
    s, dd = api("GET", f"/v13/deployments/{dep['id']}")
    if dd.get("readyState") in ("READY", "ERROR", "CANCELED"): break
    time.sleep(3)
print("state", dd.get("readyState"), "url", dd.get("url"), "alias", dd.get("alias"))
s, dm = api("GET", f"/v9/projects/{NAME}/domains"); print("domains", [x["name"] for x in dm.get("domains", [])])
s, pp = api("GET", f"/v9/projects/{NAME}"); print("ssoProtection", pp.get("ssoProtection"))
