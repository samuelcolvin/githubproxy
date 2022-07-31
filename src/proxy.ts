import mime from 'mime/lite'

export async function proxy(request: Request): Promise<Response> {
  const {pathname} = new URL(request.url)
  console.log('headers:', Object.fromEntries(request.headers.entries()))
  if (pathname === '/') {
    return info_page()
  }
  const proxy_url = proxy_path(pathname)
  const headers = new Headers(request.headers)
  const {host} = new URL(proxy_url)
  headers.set('host', host)
  headers.delete('referer')

  const fetch_response = await fetch(proxy_url, {headers})
  const response = new Response(fetch_response.body, fetch_response)
  response.headers.set('content-type', mime_type(pathname))
  response.headers.set('access-control-allow-origin', '*')
  return response
}

function info_page(): Response {
  const html = `
<div>
  <h1>GitHub Proxy</h1>
  <div>To use this proxy, append the path of the file you want from github to this domain.</div>
</div>
`
  return new Response(html, {headers: {'content-type': 'text/html'}})
}

const archive_zip_regex = new RegExp('/[^/]+/[^/]+/archive/refs/[^/]+/[^/.]+.zip')
const gist_regex = new RegExp('/[^/]+/[0-9a-f]{32}/raw/.+')

function proxy_path(pathname: string): string {
  if (archive_zip_regex.test(pathname)) {
    return 'https://github.com' + pathname
  } else if (gist_regex.test(pathname)) {
    // assume the "Raw" link on a file on a gist
    return 'https://gist.githubusercontent.com/' + pathname
  } else {
    // assume a github repo file
    return 'https://raw.githubusercontent.com' + pathname.replace('/blob', '')
  }
}

function mime_type(pathname: string): string {
  const m = pathname.toLocaleLowerCase().match(/\.([a-z]+)$/)
  let mime_type: string | null = null
  if (m) {
    const ext = m[0]
    mime_type = known_mime_types[ext]
    if (!mime_type) {
      mime_type = mime.getType(ext)
    }
  }
  return mime_type || 'application/octet-stream'
}

const known_mime_types: Record<string, string> = {
  '.ico': 'image/vnd.microsoft.icon',
}
