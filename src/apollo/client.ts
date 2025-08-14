import { ApolloClient, InMemoryCache, ApolloLink, HttpLink } from '@apollo/client'
import { RetryLink } from '@apollo/client/link/retry'

export const healthClient = new ApolloClient({
  uri: 'https://api.goldsky.com/api/public/project_cmb20ryy424yb01wy7zwd7xd1/subgraphs/analytics/1.2.3/gn',
  cache: new InMemoryCache(),
})

// export const blockClient = new ApolloClient({
//   uri: 'https://api.thegraph.com/subgraphs/name/blocklytics/ethereum-blocks',
//   cache: new InMemoryCache(),
//   queryDeduplication: true,
//   defaultOptions: {
//     watchQuery: {
//       fetchPolicy: 'no-cache',
//     },
//     query: {
//       fetchPolicy: 'no-cache',
//       errorPolicy: 'all',
//     },
//   },
// })

// export const client = new ApolloClient({
//   uri: 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3?source=uniswap',
//   cache: new InMemoryCache({
//     typePolicies: {
//       Token: {
//         // Singleton types that have no identifying field can use an empty
//         // array for their keyFields.
//         keyFields: false,
//       },
//       Pool: {
//         // Singleton types that have no identifying field can use an empty
//         // array for their keyFields.
//         keyFields: false,
//       },
//     },
//   }),
//   queryDeduplication: true,
//   defaultOptions: {
//     watchQuery: {
//       fetchPolicy: 'no-cache',
//     },
//     query: {
//       fetchPolicy: 'no-cache',
//       errorPolicy: 'all',
//     },
//   },
// })

// Simple, dependency-free rate-limited fetch for GraphQL calls
function createRateLimitedFetch(options: {
  maxConcurrency: number
  maxRequestsPerInterval: number
  intervalMs: number
}) {
  const { maxConcurrency, maxRequestsPerInterval, intervalMs } = options
  type FetchType = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
  type QueueItem = { args: Parameters<FetchType>; resolve: (v: Response) => void; reject: (e: unknown) => void }

  const queue: QueueItem[] = []
  let activeCount = 0
  let tokens = maxRequestsPerInterval

  const refill = () => {
    tokens = maxRequestsPerInterval
    pump()
  }

  const timer = setInterval(refill, intervalMs)
  // Prevent leaking timers on HMR
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => clearInterval(timer))
  }

  const pump = () => {
    if (activeCount >= maxConcurrency) return
    while (queue.length > 0 && tokens > 0 && activeCount < maxConcurrency) {
      const { args, resolve, reject } = queue.shift() as QueueItem
      tokens -= 1
      activeCount += 1
      fetch(...args)
        .then(resolve)
        .catch(reject)
        .finally(() => {
          activeCount -= 1
          pump()
        })
    }
  }

  const rateLimited: FetchType = (...args) =>
    new Promise<Response>((resolve, reject) => {
      queue.push({ args, resolve, reject })
      pump()
    })

  return rateLimited
}

const rateLimitedFetch = createRateLimitedFetch({
  maxConcurrency: 3,
  maxRequestsPerInterval: 50,
  intervalMs: 500,
})

const analyticsRetryLink = new RetryLink({
  attempts: (count, _operation, error) => {
    const statusCode = (error as any)?.statusCode || (error as any)?.networkError?.statusCode
    if (!error) return false
    if (statusCode === 429) return count <= 5
    if (statusCode && statusCode >= 500) return count <= 3
    return false
  },
  delay: (count, _operation, error) => {
    const statusCode = (error as any)?.statusCode || (error as any)?.networkError?.statusCode
    if (statusCode === 429) return Math.min(250 * 2 ** (count - 1), 4000)
    return Math.min(200 * 2 ** (count - 1), 2000)
  },
})

const analyticsLink = ApolloLink.from([
  analyticsRetryLink,
  new HttpLink({
    uri: 'https://api.goldsky.com/api/public/project_cmb20ryy424yb01wy7zwd7xd1/subgraphs/analytics/1.2.3/gn',
    fetch: rateLimitedFetch,
  }),
])

export const client = new ApolloClient({
  link: analyticsLink,
  cache: new InMemoryCache({
    typePolicies: {
      Token: {
        // Singleton types that have no identifying field can use an empty
        // array for their keyFields.
        keyFields: false,
      },
      Pool: {
        // Singleton types that have no identifying field can use an empty
        // array for their keyFields.
        keyFields: false,
      },
    },
  }),
  queryDeduplication: true,
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'no-cache',
    },
    query: {
      fetchPolicy: 'no-cache',
      errorPolicy: 'all',
    },
  },
})

export const blockClient = new ApolloClient({
  link: ApolloLink.from([
    new RetryLink({
      attempts: (count, _operation, error) => {
        const statusCode = (error as any)?.statusCode || (error as any)?.networkError?.statusCode
        if (!error) return false
        if (statusCode === 429) return count <= 5
        if (statusCode && statusCode >= 500) return count <= 3
        return false
      },
      delay: (count, _operation, error) => {
        const statusCode = (error as any)?.statusCode || (error as any)?.networkError?.statusCode
        if (statusCode === 429) return Math.min(250 * 2 ** (count - 1), 4000)
        return Math.min(200 * 2 ** (count - 1), 2000)
      },
    }),
    new HttpLink({
      uri: 'https://api.goldsky.com/api/public/project_cmb20ryy424yb01wy7zwd7xd1/subgraphs/blocks/v1.0.0/gn',
      fetch: rateLimitedFetch,
    }),
  ]),
  cache: new InMemoryCache(),
  queryDeduplication: true,
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-first',
    },
    query: {
      fetchPolicy: 'cache-first',
      errorPolicy: 'all',
    },
  },
})

export const avalancheClient = new ApolloClient({
  uri: 'https://api.thegraph.com/subgraphs/name/lynnshaoyu/uniswap-v3-avax?source=uniswap',
  cache: new InMemoryCache({
    typePolicies: {
      Token: {
        // Singleton types that have no identifying field can use an empty
        // array for their keyFields.
        keyFields: false,
      },
      Pool: {
        // Singleton types that have no identifying field can use an empty
        // array for their keyFields.
        keyFields: false,
      },
    },
  }),
  queryDeduplication: true,
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'no-cache',
    },
    query: {
      fetchPolicy: 'no-cache',
      errorPolicy: 'all',
    },
  },
})

export const avalancheBlockClient = new ApolloClient({
  uri: 'https://api.thegraph.com/subgraphs/name/lynnshaoyu/avalanche-blocks',
  cache: new InMemoryCache(),
  queryDeduplication: true,
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-first',
    },
    query: {
      fetchPolicy: 'cache-first',
      errorPolicy: 'all',
    },
  },
})

export const arbitrumClient = new ApolloClient({
  uri: 'https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-arbitrum-one?source=uniswap',
  cache: new InMemoryCache({
    typePolicies: {
      Token: {
        // Singleton types that have no identifying field can use an empty
        // array for their keyFields.
        keyFields: false,
      },
      Pool: {
        // Singleton types that have no identifying field can use an empty
        // array for their keyFields.
        keyFields: false,
      },
    },
  }),
  queryDeduplication: true,
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-first',
    },
    query: {
      fetchPolicy: 'cache-first',
      errorPolicy: 'all',
    },
  },
})

export const arbitrumBlockClient = new ApolloClient({
  uri: 'https://api.thegraph.com/subgraphs/name/ianlapham/arbitrum-one-blocks',
  cache: new InMemoryCache(),
  queryDeduplication: true,
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-first',
    },
    query: {
      fetchPolicy: 'cache-first',
      errorPolicy: 'all',
    },
  },
})

export const optimismClient = new ApolloClient({
  uri: 'https://api.thegraph.com/subgraphs/name/ianlapham/optimism-post-regenesis?source=uniswap',
  cache: new InMemoryCache({
    typePolicies: {
      Token: {
        // Singleton types that have no identifying field can use an empty
        // array for their keyFields.
        keyFields: false,
      },
      Pool: {
        // Singleton types that have no identifying field can use an empty
        // array for their keyFields.
        keyFields: false,
      },
    },
  }),
  queryDeduplication: true,
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'no-cache',
    },
    query: {
      fetchPolicy: 'no-cache',
      errorPolicy: 'all',
    },
  },
})

export const baseClient = new ApolloClient({
  uri: 'https://api.studio.thegraph.com/query/48211/uniswap-v3-base/version/latest?source=uniswap',
  cache: new InMemoryCache({
    typePolicies: {
      Token: {
        // Singleton types that have no identifying field can use an empty
        // array for their keyFields.
        keyFields: false,
      },
      Pool: {
        // Singleton types that have no identifying field can use an empty
        // array for their keyFields.
        keyFields: false,
      },
    },
  }),
  queryDeduplication: true,
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'no-cache',
    },
    query: {
      fetchPolicy: 'no-cache',
      errorPolicy: 'all',
    },
  },
})

export const baseBlockClient = new ApolloClient({
  uri: 'https://api.studio.thegraph.com/query/48211/base-blocks/version/latest',
  cache: new InMemoryCache(),
  queryDeduplication: true,
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-first',
    },
    query: {
      fetchPolicy: 'cache-first',
      errorPolicy: 'all',
    },
  },
})

export const bscClient = new ApolloClient({
  uri: 'https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-v3-bsc?source=uniswap',
  cache: new InMemoryCache({
    typePolicies: {
      Token: {
        // Singleton types that have no identifying field can use an empty
        // array for their keyFields.
        keyFields: false,
      },
      Pool: {
        // Singleton types that have no identifying field can use an empty
        // array for their keyFields.
        keyFields: false,
      },
    },
  }),
  queryDeduplication: true,
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'no-cache',
    },
    query: {
      fetchPolicy: 'no-cache',
      errorPolicy: 'all',
    },
  },
})

export const bscBlockClient = new ApolloClient({
  uri: 'https://api.thegraph.com/subgraphs/name/wombat-exchange/bnb-chain-block',
  cache: new InMemoryCache(),
  queryDeduplication: true,
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-first',
    },
    query: {
      fetchPolicy: 'cache-first',
      errorPolicy: 'all',
    },
  },
})

export const optimismBlockClient = new ApolloClient({
  uri: 'https://api.thegraph.com/subgraphs/name/ianlapham/uni-testing-subgraph',
  cache: new InMemoryCache(),
  queryDeduplication: true,
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-first',
    },
    query: {
      fetchPolicy: 'cache-first',
      errorPolicy: 'all',
    },
  },
})

export const polygonClient = new ApolloClient({
  uri: 'https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-v3-polygon?source=uniswap',
  cache: new InMemoryCache({
    typePolicies: {
      Token: {
        // Singleton types that have no identifying field can use an empty
        // array for their keyFields.
        keyFields: false,
      },
      Pool: {
        // Singleton types that have no identifying field can use an empty
        // array for their keyFields.
        keyFields: false,
      },
    },
  }),
  queryDeduplication: true,
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'no-cache',
    },
    query: {
      fetchPolicy: 'no-cache',
      errorPolicy: 'all',
    },
  },
})

export const polygonBlockClient = new ApolloClient({
  uri: 'https://api.thegraph.com/subgraphs/name/ianlapham/polygon-blocks',
  cache: new InMemoryCache(),
  queryDeduplication: true,
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-first',
    },
    query: {
      fetchPolicy: 'cache-first',
      errorPolicy: 'all',
    },
  },
})

export const celoClient = new ApolloClient({
  uri: 'https://api.thegraph.com/subgraphs/name/jesse-sawa/uniswap-celo?source=uniswap',
  cache: new InMemoryCache({
    typePolicies: {
      Token: {
        // Singleton types that have no identifying field can use an empty
        // array for their keyFields.
        keyFields: false,
      },
      Pool: {
        // Singleton types that have no identifying field can use an empty
        // array for their keyFields.
        keyFields: false,
      },
    },
  }),
  queryDeduplication: true,
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'no-cache',
    },
    query: {
      fetchPolicy: 'no-cache',
      errorPolicy: 'all',
    },
  },
})

export const celoBlockClient = new ApolloClient({
  uri: 'https://api.thegraph.com/subgraphs/name/jesse-sawa/celo-blocks',
  cache: new InMemoryCache(),
  queryDeduplication: true,
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-first',
    },
    query: {
      fetchPolicy: 'cache-first',
      errorPolicy: 'all',
    },
  },
})
