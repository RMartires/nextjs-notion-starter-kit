import { type Block } from 'notion-types'
import { normalizeUrl } from 'notion-utils'

import { defaultPageCover, defaultPageIcon } from './config'

export const mapImageUrl = (url: string | undefined, block: Block) => {
  if (!url) return null

  if (url === defaultPageCover || url === defaultPageIcon) {
    return url
  }

  // Handle images from Notion
  if (url.startsWith('https://www.notion.so')) {
    return url
  }

  try {
    const u = new URL(url)

    // Return the URL as-is if it's already normalized and not from a special service
    if (!u.host.includes('amazonaws.com') && !u.host.includes('notion.so')) {
      return normalizeUrl(url)
    }

    return url
  } catch (err) {
    return url
  }
}
