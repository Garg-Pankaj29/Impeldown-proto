import urllib.request, urllib.parse, json, email.message, urllib.error
import base64, hmac, hashlib, time

def b64url(b): return base64.urlsafe_b64encode(b).decode('utf-8').rstrip('=')

header = {'alg': 'HS256', 'typ': 'JWT'}
payload = {'id': 1, 'email': 'test@example.com', 'role': 'guard', 'name': 'Reporter', 'exp': int(time.time()) + 86400}
secret = b'impel-down-secret-key-123'

header_b64 = b64url(json.dumps(header).encode('utf-8'))
payload_b64 = b64url(json.dumps(payload).encode('utf-8'))
sig = hmac.new(secret, f'{header_b64}.{payload_b64}'.encode('utf-8'), hashlib.sha256).digest()
token = f'{header_b64}.{payload_b64}.{b64url(sig)}'

data = b'--boundary\r\nContent-Disposition: form-data; name="title"\r\n\r\nTest Upload\r\n--boundary\r\nContent-Disposition: form-data; name="location"\r\n\r\nLevel 1: Crimson Hell\r\n--boundary\r\nContent-Disposition: form-data; name="category"\r\n\r\nCELL_RIOT\r\n--boundary\r\nContent-Disposition: form-data; name="occurredAt"\r\n\r\n2026-09-28T09:48:00.000Z\r\n--boundary\r\nContent-Disposition: form-data; name="reporter"\r\n\r\nReporter\r\n--boundary\r\nContent-Disposition: form-data; name="photos"; filename="test.png"\r\nContent-Type: image/png\r\n\r\nfake_image_data\r\n--boundary--\r\n'

req2 = urllib.request.Request('http://localhost:5173/api/incidents', data=data, headers={'Content-Type': 'multipart/form-data; boundary=boundary', 'Authorization': 'Bearer ' + token})
try:
    res2 = urllib.request.urlopen(req2)
    print(res2.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print('Error:', e.code)
    print(e.read().decode('utf-8'))
