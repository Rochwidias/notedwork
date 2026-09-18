"""Minimal Google Keep API integration.
Uses unofficial Keep API via REST endpoints. Requires an OAuth2 access token with
scope https://www.googleapis.com/auth/keep.
"""
import json, urllib.request

class GoogleKeepClient:
    BASE_URL="https://keep.googleapis.com/v1"
    def __init__(self, token):
        self.headers={"Authorization":f"Bearer {token}","Content-Type":"application/json"}
    def _request(self,meth,path,data=None):
        url=self.BASE_URL+path
        body=json.dumps(data).encode() if data else None
        req=urllib.request.Request(url, data=body, method=meth, headers=self.headers)
        with urllib.request.urlopen(req) as r:
            return json.load(r)
    def list_notes(self):return self._request("GET","/notes")
    def get_note(self,nid):return self._request("GET",f"/notes/{nid}")
    def create_note(self,title,text=""):
        return self._request("POST","/notes",{"title":title,"textContent":{"text":text}})
    def update_note(self,nid,title=None,text=None):
        p={}
        if title: p["title"]=title
        if text: p["textContent"]={"text":text}
        return self._request("PATCH",f"/notes/{nid}",p)
    def delete_note(self,nid):return self._request("DELETE",f"/notes/{nid}")
# usage: client=GoogleKeepClient("YOUR_ACCESS_TOKEN")
