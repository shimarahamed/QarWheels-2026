export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const route = url.pathname.replace(/^\/+|\/+$/g, '') || 'home';
    const publicPages = ['home','product','drivers','garages','how-it-works','about','contact','privacy','terms'];
    if (['GET','HEAD'].includes(request.method) && publicPages.includes(route)) {
      const lang = url.searchParams.get('lang') === 'ar' ? 'ar' : 'en';
      const pageUrl = new URL(request.url);
      pageUrl.pathname = '/__pages/' + lang + '/' + route + '.html';
      pageUrl.search = '';
      const page = await env.ASSETS.fetch(new Request(pageUrl, request));
      if (page.ok) return page;
    }
    const response = await env.ASSETS.fetch(request);
    const acceptsHtml = request.headers.get("accept")?.includes("text/html");

    if (response.status !== 404 || !acceptsHtml || !["GET", "HEAD"].includes(request.method)) {
      return response;
    }

    const indexUrl = new URL(request.url);
    indexUrl.pathname = "/index.html";
    indexUrl.search = "";
    return env.ASSETS.fetch(new Request(indexUrl, request));
  },
};
