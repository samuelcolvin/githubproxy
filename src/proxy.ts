import mime from 'mime/lite'

export async function proxy(request: Request): Promise<Response> {
  const {pathname} = new URL(request.url)
  let proxy_url
  if (pathname === '/') {
    proxy_url = 'https://github.com/samuelcolvin/githubproxy/blob/main/index.html'
  } else {
    proxy_url = proxy_path(pathname)
  }
  console.log(`proxying ${pathname} -> ${proxy_url}`)
  const request_headers = new Headers(request.headers)
  const {host} = new URL(proxy_url)
  request_headers.set('host', host)
  request_headers.set('origin', host)
  request_headers.delete('referer')

  const response_headers = {
    'content-type': mime_type(pathname),
    'access-control-allow-origin': '*',
  }

  const fetch_response = await fetch(proxy_url, {headers: request_headers})
  return new Response(fetch_response.body, {headers: response_headers, status: fetch_response.status})
}

const archive_zip_regex = new RegExp('/[^/]+/[^/]+/archive/.+?.zip')
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
