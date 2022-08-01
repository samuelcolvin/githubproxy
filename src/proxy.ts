import mime from 'mime/lite'

export async function proxy(request: Request): Promise<Response> {
  let {pathname} = new URL(request.url)
  pathname = custom_pathnames[pathname] || pathname
  const proxy_url = proxy_path(pathname)
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

const custom_pathnames: Record<string, string> = {
  '/': '/samuelcolvin/githubproxy/blob/main/index.html',
  '/favicon.ico': '/samuelcolvin/smokeshow/blob/main/icons/favicon.ico',
}

const archive_zip_regex = new RegExp('/[^/]+/[^/]+/archive/.+?.zip')
const gist_regex = new RegExp('/[^/]+/[0-9a-f]{32}/raw/.+')

function proxy_path(pathname: string): string {
  if (archive_zip_regex.test(pathname)) {
    console.log(`${pathname} is an archive zip`)
    return 'https://github.com' + pathname
  } else if (gist_regex.test(pathname)) {
    console.log(`${pathname} is a gist`)
    // assume the "Raw" link on a file on a gist
    return 'https://gist.githubusercontent.com/' + pathname
  } else {
    console.log(`${pathname} is a regular file`)
    // assume a github repo file
    return 'https://raw.githubusercontent.com' + pathname.replace('/blob', '')
  }
}

function mime_type(pathname: string): string {
  let mime_type: string | null = null
  const m_filename = pathname.match(/[^/]+$/)
  if (m_filename) {
    mime_type = known_mime_filenames[m_filename[0]]
  }
  if (mime_type == null) {
    const m_ext = pathname.toLocaleLowerCase().match(/\.[a-z]+$/)
    if (m_ext) {
      const ext = m_ext[0]
      mime_type = known_mime_extensions[ext]
      if (!mime_type) {
        mime_type = mime.getType(ext)
      }
    }
  }
  return mime_type || 'application/octet-stream'
}

const known_mime_extensions: Record<string, string> = {
  '.ico': 'image/vnd.microsoft.icon',
  '.lock': 'text/plain',
}

const known_mime_filenames: Record<string, string> = {
  '.gitignore': 'text/plain',
  '.gitattributes': 'text/plain',
  'Makefile': 'text/plain',
  'LICENSE': 'text/plain',
}
