import mime from 'mime/lite'

export async function proxy(request: Request): Promise<Response> {
  const pathname = get_pathname(request.url)
  const proxy_url = proxy_path(pathname)
  console.log(`proxying ${pathname} -> ${proxy_url}`)
  const request_headers = new Headers(request.headers)
  const {host} = new URL(proxy_url)
  request_headers.set('host', host)
  request_headers.set('origin', host)
  request_headers.delete('referer')

  const fetch_response = await fetch(proxy_url, {headers: request_headers})
  let content_type = mime_type(pathname)
  if (fetch_response.status != 200 && !['text/html', 'text/plain'].includes(content_type)) {
    // if we got a non-200 response, and it's not a text response, force text/plain
    content_type = 'text/plain'
  }
  const response_headers = {
    'content-type': content_type,
    'access-control-allow-origin': '*',
  }
  return new Response(fetch_response.body, {headers: response_headers, status: fetch_response.status})
}

const custom_pathnames: Record<string, string> = {
  '/': '/samuelcolvin/githubproxy/blob/main/index.html',
  '/favicon.ico': '/samuelcolvin/smokeshow/blob/main/icons/favicon.ico',
}
const repo_root_regex = new RegExp('^/[^/]+/[^/]+/blob/[^/]+/?$')

function get_pathname(url: string): string {
  let {pathname} = new URL(url)
  // remove extra leading slashes in case of copy-and-paste mistakes
  pathname = pathname.replace(/^\/{2,}/, '/')
  const static_custom = custom_pathnames[pathname]
  if (static_custom) {
    return static_custom
  } else if (repo_root_regex.test(pathname)) {
    return pathname + (pathname.endsWith('/') ? '' : '/') + '/README.md'
  } else {
    return pathname
  }
}

const archive_zip_regex = new RegExp('^/[^/]+/[^/]+/archive/.+?.zip?')
const gist_regex = new RegExp('^/[^/]+/[0-9a-f]{32}/raw/')

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
  const m_ext = pathname.toLocaleLowerCase().match(/\.[a-z]+$/)
  if (m_ext) {
    const ext = m_ext[0]
    mime_type = known_mime_extensions[ext]
    if (!mime_type) {
      mime_type = mime.getType(ext)
    }
  }
  // defaulting to text/plain covers all the other files we don't know about
  // e.g. .lock, .gitignore, Makefile - I'm sure this will mess up someone's day, but it's very useful
  // in many cases.
  return mime_type || 'text/plain'
}

const known_mime_extensions: Record<string, string> = {
  '.ico': 'image/vnd.microsoft.icon',
}
