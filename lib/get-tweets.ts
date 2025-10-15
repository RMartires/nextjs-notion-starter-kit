import { type ExtendedRecordMap, type Block } from 'notion-types'
import pMap from 'p-map'
import pMemoize from 'p-memoize'
import fetch from 'isomorphic-unfetch'

import type { ExtendedTweetRecordMap } from './types'
import { db } from './db'

function getPageTweetIds(recordMap: ExtendedRecordMap): string[] {
  const tweetIds = new Set<string>()

  // Search for tweet blocks
  Object.values(recordMap.block).forEach(({ value: block }) => {
    if (!block) return

    if (block.type === 'tweet') {
      const src = block.properties?.source?.[0]?.[0]
      if (!src) return

      // Extract tweet ID from URL
      const match = src.match(/https:\/\/twitter\.com\/\w+\/status\/(\d+)/)
      if (match && match[1]) {
        tweetIds.add(match[1])
      }
    }
  })

  return Array.from(tweetIds)
}

async function getTweetData(tweetId: string) {
  try {
    const response = await fetch(
      `https://publish.twitter.com/oembed?url=https://twitter.com/i/status/${tweetId}`
    )
    if (!response.ok) return null
    const data = await response.json()
    return {
      id: tweetId,
      html: data.html,
      author_name: data.author_name,
      author_url: data.author_url,
      text: data.text
    }
  } catch (err) {
    console.warn('Error fetching tweet data:', err)
    return null
  }
}

export async function getTweetsMap(
  recordMap: ExtendedRecordMap
): Promise<void> {
  const tweetIds = getPageTweetIds(recordMap)

  const tweetsMap = Object.fromEntries(
    await pMap(
      tweetIds,
      async (tweetId: string) => {
        return [tweetId, await getTweet(tweetId)]
      },
      {
        concurrency: 8
      }
    )
  )

  ;(recordMap as ExtendedTweetRecordMap).tweets = tweetsMap
}

async function getTweetImpl(tweetId: string): Promise<any> {
  if (!tweetId) return null

  const cacheKey = `tweet:${tweetId}`

  try {
    try {
      const cachedTweet = await db.get(cacheKey)
      if (cachedTweet || cachedTweet === null) {
        return cachedTweet
      }
    } catch (err: any) {
      // ignore redis errors
      console.warn(`redis error get "${cacheKey}"`, err.message)
    }

    const tweetData = (await getTweetData(tweetId)) || null

    try {
      await db.set(cacheKey, tweetData)
    } catch (err: any) {
      // ignore redis errors
      console.warn(`redis error set "${cacheKey}"`, err.message)
    }

    return tweetData
  } catch (err: any) {
    console.warn('failed to get tweet', tweetId, err.message)
    return null
  }
}

export const getTweet = pMemoize(getTweetImpl)
