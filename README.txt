NAV CAL - GitHub Pages Offline Package

UPLOAD:
1. Extract this ZIP.
2. Upload ALL files inside this folder to the ROOT of your GitHub Pages repository.
3. Commit/push, then open the GitHub Pages HTTPS URL in Safari while online.
4. Open the map and browse/zoom the areas you want available offline. Wait for satellite tiles to finish loading.
5. Close Safari, then reopen the installed Home Screen app while offline.

IMPORTANT:
- Service Worker requires HTTPS (GitHub Pages provides HTTPS); opening index.html as file:// will NOT enable offline caching.
- Only map tiles actually viewed while online are cached. Unvisited areas cannot appear offline.
- Cache is limited to approximately 1200 map tile responses and browser storage policies may evict data.
- Keep the app opened online long enough for Leaflet, its plugins, and the selected map tiles to load once.
- On iPhone: Safari > Share > Add to Home Screen.
