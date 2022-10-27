import mime from 'mime/lite'

export async function proxy(request: Request): Promise<Response> {
  const pathname = get_pathname(request.url)
  if (pathname.startsWith('/search')) {
    return search_redirect(request)
  }

  const proxy_url = proxy_path(pathname)
  console.log(`proxying ${pathname} -> ${proxy_url}`)

  const fetch_response = await fetch(proxy_url, {headers: gh_request_headers(request, proxy_url)})

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

const archive_zip_regex = new RegExp('^/[^/]+/[^/]+/archive/.+?.zip$')
const gist_regex = new RegExp('^/[^/]+/[0-9a-f]{32}/raw/')
const reload_asset_regex = new RegExp('^/[^/]+/[^/]+/releases/download/')

function proxy_path(pathname: string): string {
  if (archive_zip_regex.test(pathname)) {
    console.log(`${pathname} is an archive zip`)
    return 'https://github.com' + pathname
  } else if (gist_regex.test(pathname)) {
    console.log(`${pathname} is a gist`)
    // assume the "Raw" link on a file on a gist
    return 'https://gist.githubusercontent.com' + pathname
  } else if (reload_asset_regex.test(pathname)) {
    // we go to the github.com URL and let github do the redirecting
    return 'https://github.com' + pathname
  } else {
    console.log(`${pathname} is a regular file`)
    // assume a github repo file
    return 'https://raw.githubusercontent.com' + pathname.replace('/blob', '')
  }
}

function gh_request_headers(request: Request, url: string): Headers {
  const headers = new Headers(request.headers)
  const {host} = new URL(url)
  headers.set('host', host)
  headers.set('origin', host)
  headers.delete('referer')
  return headers
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
  '.whl': 'application/octet-stream',
}

const issue_regex = new RegExp('^([^/#]+)/([^/#]+)#(\\d+)$')

// To use as a chrome custom search engine:
function search_redirect(request: Request): Response {
  const {searchParams} = new URL(request.url)
  const search_param = searchParams.get('search')
  const issue_match = search_param?.match(issue_regex)
  if (issue_match) {
    const [, owner, repo, id] = issue_match
    // even if this is a PR, github will redirect to the PR
    return Response.redirect(`https://github.com/${owner}/${repo}/issues/${id}`, 302)
  } else if (search_param) {
    return Response.redirect(`https://github.com/${search_param}`, 302)
  } else {
    return new Response('No "search" param provided', {status: 400})
  }
}
