import type { ComponentType } from 'react'
import type { SlipModel } from '@shared/slip-model'
import type { DesignMeta, TokenValues } from './types'

export interface DesignProps {
  slip: SlipModel
  tokens: TokenValues
}

export interface DesignModule {
  meta: DesignMeta
  Component: ComponentType<DesignProps>
}
