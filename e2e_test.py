import urllib.request
import json
import urllib.error

base_url = 'http://127.0.0.1:8000'

def request(method, path, data=None):
    req = urllib.request.Request(base_url + path, method=method)
    if data:
        req.add_header('Content-Type', 'application/json')
        req.data = json.dumps(data).encode('utf-8')
    try:
        res = urllib.request.urlopen(req)
        return json.loads(res.read())
    except urllib.error.HTTPError as e:
        print(f'HTTPError: {e.code} for {path}')
        return json.loads(e.read())

print('1. Reconcile')
res_recon = request('POST', '/api/reconcile')
print(f'Response: {res_recon}')
print(f'Total cases: {res_recon.get("total_cases", "ERROR")}')

print('2. Get Cases')
res_cases = request('GET', '/api/cases?limit=1')
case_id = res_cases['items'][0]['case_id']
print(f'Case: {case_id}')

print('3. Investigate Case')
res_inv = request('GET', f'/api/cases/{case_id}')
print(f'Classification: {res_inv["classification"]}')

print('4. Resolve')
res_resolve = request('POST', f'/api/cases/{case_id}/resolve', {'action_taken': 'Tested E2E flow', 'approved_by': 'Validator'})
print(f'Action status: {res_resolve["status"]}')

print('5. Verify')
res_verify = request('POST', f'/api/cases/{case_id}/verify')
print(f'Verification status: {res_verify["status"]}')
