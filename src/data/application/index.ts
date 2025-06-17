//import { useActiveNetworkVersion } from 'state/application/hooks'
import { healthClient } from './../../apollo/client'
import { useQuery } from '@apollo/client'
import gql from 'graphql-tag'
import { JsonRpcProvider } from '@ethersproject/providers'
import { useEffect, useState } from 'react'
//import { ArbitrumNetworkInfo, EthereumNetworkInfo } from 'constants/networks'

// export const SUBGRAPH_HEALTH = gql`
//   query health($name: Bytes) {
//     indexingStatusForCurrentVersion(subgraphName: $name, subgraphError: allow) {
//       synced
//       health
//       chains {
//         chainHeadBlock {
//           number
//         }
//         latestBlock {
//           number
//         }
//       }
//     }
//   }
// `

const META = gql`
  {
    _meta {
      block {
        number
      }
      hasIndexingErrors
    }
  }
`

interface HealthResponse {
  _meta: {
    block: {
      number: string
    }
    hasIndexingErrors: boolean
  }
}

/**
 * Fetch top addresses by volume
 */
export function useFetchedSubgraphStatus(): {
  available: boolean | null
  syncedBlock: number | undefined
  headBlock: number | undefined
} {
  //const [activeNetwork] = useActiveNetworkVersion()

  const [health, setHealth] = useState<{
    available: boolean | null
    syncedBlock: number | undefined
    headBlock: number | undefined
  }>({
    available: null,
    syncedBlock: undefined,
    headBlock: undefined,
  })

  const { loading, error, data } = useQuery<HealthResponse>(META, {
    client: healthClient,
    fetchPolicy: 'network-only',
    // variables: {
    //   name:
    //     activeNetwork === EthereumNetworkInfo
    //       ? 'uniswap/uniswap-v3'
    //       : activeNetwork === ArbitrumNetworkInfo
    //       ? 'ianlapham/uniswap-arbitrum-one'
    //       : 'ianlapham/uniswap-optimism',
    // },
  })
  const provider = new JsonRpcProvider('https://rpc.hyperliquid.xyz/evm')

  //const parsed = data?.indexingStatusForCurrentVersion

  const getHealth = async () => {
    if (!data) return
    const head = await provider.getBlockNumber()
    const syncedBlock = parseInt(data._meta.block.number)

    const available = head - syncedBlock < 10
    debugger
    setHealth({
      available: available,
      syncedBlock: syncedBlock,
      headBlock: head,
    })
  }

  useEffect(() => {
    if (loading) {
      setHealth({
        available: null,
        syncedBlock: undefined,
        headBlock: undefined,
      })
    } else {
      getHealth()
    }
  }, [loading, error, data])

  return health
}
