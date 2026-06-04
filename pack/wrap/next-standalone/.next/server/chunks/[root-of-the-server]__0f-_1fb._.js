module.exports=[918622,(e,t,r)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},556704,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},832319,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},324725,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},193695,(e,t,r)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},140951,e=>{"use strict";var t=e.i(747909),r=e.i(174017),a=e.i(996250),n=e.i(759756),o=e.i(561916),i=e.i(174677),s=e.i(869741),l=e.i(316795),u=e.i(487718),d=e.i(995169),c=e.i(47587),p=e.i(666012),h=e.i(570101),R=e.i(626937),g=e.i(10372),x=e.i(193695);e.i(820232);var v=e.i(257297),f=e.i(89171);async function w(e){let{searchParams:t}=new URL(e.url),r=t.get("v")||"25.0",a=r.replace(/\./g,"_"),n=new URL(e.url).origin,o=`@echo off
setlocal
title [Ribbon Bridge] One-Click Auto Repair & Update Tool

echo.
echo ======================================================
echo    Ribbon Bridge One-Click Auto Repair (Nuclear)
echo ======================================================
echo.
echo This tool will automatically:
echo 1. Force close running bridge processes (Unlocking files)
echo 2. Download the latest installer (v${r})
echo 3. Launch the setup program immediately
echo.
echo [IMPORTANT] Any pending print jobs will be lost.
echo.
echo Press any key to start the repair process...
pause >nul

echo.
echo [1/3] Step 1: Force closing background processes...
taskkill /f /im launch_service.exe /t >nul 2>&1
taskkill /f /im RibbonBridge_Core.exe /t >nul 2>&1
taskkill /f /im RibbonBridge.exe /t >nul 2>&1
timeout /t 2 /nobreak >nul

echo.
echo [2/3] Step 2: Downloading latest installer from server...
set DOWNLOAD_URL=${n}/RibbonBridge_Setup_v${a}.exe
set SAVE_PATH=%TEMP%\\RibbonBridge_Setup_v${a}.exe

echo Source: %DOWNLOAD_URL%
echo Target: %SAVE_PATH%

:: Try download with PowerShell
powershell -Command "Invoke-WebRequest -Uri '%DOWNLOAD_URL%' -OutFile '%SAVE_PATH%'"

if exist "%SAVE_PATH%" (
    echo.
    echo [3/3] Step 3: Download successful! Launching installer...
    start "" "%SAVE_PATH%"
) else (
    echo.
    echo [ERROR] Download failed. Please check your internet connection.
    echo Site URL: ${n}
    pause
    exit
)

echo.
echo Repair script completed. 
echo After the installer finishes, please REFRESH your browser.
timeout /t 5 >nul
exit
`;return new f.NextResponse(o,{headers:{"Content-Type":"application/octet-stream","Content-Disposition":"attachment; filename=Bridge_Auto_Repair.bat"}})}e.s(["GET",0,w],230043);var m=e.i(230043);let b=new t.AppRouteRouteModule({definition:{kind:r.RouteKind.APP_ROUTE,page:"/api/bridge-reset/route",pathname:"/api/bridge-reset",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/src/app/api/bridge-reset/route.ts",nextConfigOutput:"standalone",userland:m}),{workAsyncStorage:E,workUnitAsyncStorage:A,serverHooks:y}=b;async function C(e,t,a){a.requestMeta&&(0,n.setRequestMeta)(e,a.requestMeta),b.isDev&&(0,n.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let f="/api/bridge-reset/route";f=f.replace(/\/index$/,"")||"/";let w=await b.prepare(e,t,{srcPage:f,multiZoneDraftMode:!1});if(!w)return t.statusCode=400,t.end("Bad Request"),null==a.waitUntil||a.waitUntil.call(a,Promise.resolve()),null;let{buildId:m,params:E,nextConfig:A,parsedUrl:y,isDraftMode:C,prerenderManifest:T,routerServerContext:_,isOnDemandRevalidate:S,revalidateOnlyGenerated:k,resolvedPathname:P,clientReferenceManifest:O,serverActionsManifest:N}=w,U=(0,s.normalizeAppPath)(f),q=!!(T.dynamicRoutes[U]||T.routes[P]),D=async()=>((null==_?void 0:_.render404)?await _.render404(e,t,y,!1):t.end("This page could not be found"),null);if(q&&!C){let e=!!T.routes[P],t=T.dynamicRoutes[U];if(t&&!1===t.fallback&&!e){if(A.adapterPath)return await D();throw new x.NoFallbackError}}let H=null;!q||b.isDev||C||(H="/index"===(H=P)?"/":H);let j=!0===b.isDev||!q,I=q&&!j;N&&O&&(0,i.setManifestsSingleton)({page:f,clientReferenceManifest:O,serverActionsManifest:N});let M=e.method||"GET",L=(0,o.getTracer)(),$=L.getActiveScopeSpan(),B=!!(null==_?void 0:_.isWrappedByNextServer),F=!!(0,n.getRequestMeta)(e,"minimalMode"),K=(0,n.getRequestMeta)(e,"incrementalCache")||await b.getIncrementalCache(e,A,T,F);null==K||K.resetRequestCache(),globalThis.__incrementalCache=K;let V={params:E,previewProps:T.preview,renderOpts:{experimental:{authInterrupts:!!A.experimental.authInterrupts},cacheComponents:!!A.cacheComponents,supportsDynamicResponse:j,incrementalCache:K,cacheLifeProfiles:A.cacheLife,waitUntil:a.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,r,a,n)=>b.onRequestError(e,t,a,n,_)},sharedContext:{buildId:m}},W=new l.NodeNextRequest(e),G=new l.NodeNextResponse(t),X=u.NextRequestAdapter.fromNodeNextRequest(W,(0,u.signalFromNodeResponse)(t));try{let n,i=async e=>b.handle(X,V).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let r=L.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==d.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let a=r.get("next.route");if(a){let t=`${M} ${a}`;e.setAttributes({"next.route":a,"http.route":a,"next.span_name":t}),e.updateName(t),n&&n!==e&&(n.setAttribute("http.route",a),n.updateName(t))}else e.updateName(`${M} ${f}`)}),s=async n=>{var o,s;let l=async({previousCacheEntry:r})=>{try{if(!F&&S&&k&&!r)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let o=await i(n);e.fetchMetrics=V.renderOpts.fetchMetrics;let s=V.renderOpts.pendingWaitUntil;s&&a.waitUntil&&(a.waitUntil(s),s=void 0);let l=V.renderOpts.collectedTags;if(!q)return await (0,p.sendResponse)(W,G,o,V.renderOpts.pendingWaitUntil),null;{let e=await o.blob(),t=(0,h.toNodeOutgoingHttpHeaders)(o.headers);l&&(t[g.NEXT_CACHE_TAGS_HEADER]=l),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==V.renderOpts.collectedRevalidate&&!(V.renderOpts.collectedRevalidate>=g.INFINITE_CACHE)&&V.renderOpts.collectedRevalidate,a=void 0===V.renderOpts.collectedExpire||V.renderOpts.collectedExpire>=g.INFINITE_CACHE?void 0:V.renderOpts.collectedExpire;return{value:{kind:v.CachedRouteKind.APP_ROUTE,status:o.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:a}}}}catch(t){throw(null==r?void 0:r.isStale)&&await b.onRequestError(e,t,{routerKind:"App Router",routePath:f,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:I,isOnDemandRevalidate:S})},!1,_),t}},u=await b.handleResponse({req:e,nextConfig:A,cacheKey:H,routeKind:r.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:T,isRoutePPREnabled:!1,isOnDemandRevalidate:S,revalidateOnlyGenerated:k,responseGenerator:l,waitUntil:a.waitUntil,isMinimalMode:F});if(!q)return null;if((null==u||null==(o=u.value)?void 0:o.kind)!==v.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==u||null==(s=u.value)?void 0:s.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});F||t.setHeader("x-nextjs-cache",S?"REVALIDATED":u.isMiss?"MISS":u.isStale?"STALE":"HIT"),C&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let d=(0,h.fromNodeOutgoingHttpHeaders)(u.value.headers);return F&&q||d.delete(g.NEXT_CACHE_TAGS_HEADER),!u.cacheControl||t.getHeader("Cache-Control")||d.get("Cache-Control")||d.set("Cache-Control",(0,R.getCacheControlHeader)(u.cacheControl)),await (0,p.sendResponse)(W,G,new Response(u.value.body,{headers:d,status:u.value.status||200})),null};B&&$?await s($):(n=L.getActiveScopeSpan(),await L.withPropagatedContext(e.headers,()=>L.trace(d.BaseServerSpan.handleRequest,{spanName:`${M} ${f}`,kind:o.SpanKind.SERVER,attributes:{"http.method":M,"http.target":e.url}},s),void 0,!B))}catch(t){if(t instanceof x.NoFallbackError||await b.onRequestError(e,t,{routerKind:"App Router",routePath:U,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:I,isOnDemandRevalidate:S})},!1,_),q)throw t;return await (0,p.sendResponse)(W,G,new Response(null,{status:500})),null}}e.s(["handler",0,C,"patchFetch",0,function(){return(0,a.patchFetch)({workAsyncStorage:E,workUnitAsyncStorage:A})},"routeModule",0,b,"serverHooks",0,y,"workAsyncStorage",0,E,"workUnitAsyncStorage",0,A],140951)}];

//# sourceMappingURL=%5Broot-of-the-server%5D__0f-_1fb._.js.map