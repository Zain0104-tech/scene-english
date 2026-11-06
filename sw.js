var CACHE = 'scene-english-v3.19';
var STATIC_FILES = ['./manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(cache){
      return fetch('./index.html', {cache: 'no-store'}).then(function(res){
        if(!res.ok) throw new Error('index fetch failed');
        var copy = res.clone();
        return cache.put('./index.html', res).then(function(){
          return cache.put('./', copy);
        });
      }).then(function(){
        return cache.addAll(STATIC_FILES);
      });
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){
        if(k !== CACHE) return caches.delete(k);
      }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('push', function(e){
  var title = '情景英语';
  var body = '该学今天这一组了';
  var url = self.registration.scope;
  try{
    if(e.data){
      var d = e.data.json();
      if(d){
        if(d.title) title = d.title;
        if(d.body) body = d.body;
        if(d.url) url = new URL(d.url, self.registration.scope).href;
      }
    }
  }catch(err){}
  e.waitUntil(
    self.registration.showNotification(title, {
      body: body,
      icon: self.registration.scope + 'icon-192.png',
      data: {url: url}
    })
  );
});

self.addEventListener('notificationclick', function(e){
  e.notification.close();
  var target = (e.notification.data && e.notification.data.url) || self.registration.scope;
  e.waitUntil(
    self.clients.matchAll({type: 'window', includeUncontrolled: true}).then(function(list){
      for(var i = 0; i < list.length; i++){
        var c = list[i];
        if(c.url.indexOf(self.registration.scope) === 0 && 'focus' in c){
          if('navigate' in c && c.url !== target){
            return c.navigate(target).then(function(nc){ return (nc || c).focus(); });
          }
          return c.focus();
        }
      }
      if(self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});

self.addEventListener('fetch', function(e){
  if(e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  if(url.origin !== self.location.origin) return;

  var isDocument = e.request.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('/index.html');
  if(isDocument){
    e.respondWith(
      fetch(e.request, {cache: 'no-store'}).then(function(res){
        var copy = res.clone();
        caches.open(CACHE).then(function(cache){ cache.put('./index.html', copy); });
        return res;
      }).catch(function(){
        return caches.match('./index.html', {ignoreSearch: true});
      })
    );
    return;
  }

  e.respondWith(
    caches.match(e.request, {ignoreSearch: true}).then(function(hit){
      if(hit) return hit;
      return fetch(e.request).then(function(res){
        var copy = res.clone();
        caches.open(CACHE).then(function(cache){ cache.put(e.request, copy); });
        return res;
      });
    })
  );
});
