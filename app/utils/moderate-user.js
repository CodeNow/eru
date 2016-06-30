import cookie from 'react-cookie'

function moderateUser (user, domain) {
  const tokenString = document.cookie
    .split(';')
    .filter((c) => (c.split('=')[0].indexOf('CSRF-TOKEN') > -1))[0]
    .split('=')
    .pop()
  if (!tokenString) {
    throw new Error('Cannot moderate w/o a CSRF token.')
  }
  if (!user) {
    throw new Error('Cannot call moderateUser w/o a user.')
  }
  const accessToken = user.githubAccessToken
  window.fetch(
    `https://api.${domain}/auth/github/token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': tokenString
      },
      credentials: 'include',
      body: JSON.stringify({ accessToken })
    }
  )
    .then((res) => {
      if (res.status === 200) {
        cookie.save(
          'isModerating',
          user.githubID.toString(),
          {
            domain: '.' + domain,
            path: '/'
          }
        )
        window.location.assign(`https://${domain}/`)
      } else {
        throw new Error('Authentication Failed.')
      }
    })
}

export default moderateUser
