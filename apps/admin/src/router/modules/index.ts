import { AppRouteRecord } from '@/types/router'
import { platformRoutes } from './platform'

/**
 * 导出所有模块化路由
 */
export const routeModules: AppRouteRecord[] = [platformRoutes]
