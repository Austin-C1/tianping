/**
 * 绯荤粺鍏ㄥ眬閰嶇疆
 *
 * 杩欐槸绯荤粺鐨勬牳蹇冮厤缃枃浠讹紝闆嗕腑绠＄悊鎵€鏈夊叏灞€閰嶇疆椤广€? * 鍖呭惈绯荤粺淇℃伅銆佷富棰樻牱寮忋€佽彍鍗曞竷灞€銆侀鑹叉柟妗堢瓑鎵€鏈夊彲閰嶇疆椤广€? *
 * ## 涓昏鍔熻兘
 *
 * - 绯荤粺淇℃伅 - 绯荤粺鍚嶇О绛夊熀纭€淇℃伅
 * - 涓婚閰嶇疆 - 浜壊/鏆楄壊/鑷姩涓婚鐨勬牱寮忛厤缃? * - 鑿滃崟閰嶇疆 - 鑿滃崟甯冨眬銆佷富棰樸€佸搴︾瓑閰嶇疆
 * - 棰滆壊鏂规 - 绯荤粺涓昏壊鍜岄璁鹃鑹插垪琛? * - 蹇€熷叆鍙?- 蹇€熷叆鍙ｅ簲鐢ㄥ拰閾炬帴閰嶇疆
 * - 椤堕儴鏍忛厤缃?- 椤堕儴鏍忓姛鑳芥ā鍧楅厤缃? *
 * ## 閰嶇疆椤硅鏄? *
 * - systemInfo: 绯荤粺鍩虹淇℃伅锛堝悕绉扮瓑锛? * - systemThemeStyles: 绯荤粺涓婚鏍峰紡鏄犲皠
 * - settingThemeList: 鍙€夌殑绯荤粺涓婚鍒楄〃
 * - menuLayoutList: 鍙€夌殑鑿滃崟甯冨眬鍒楄〃
 * - themeList: 鑿滃崟涓婚鏍峰紡鍒楄〃
 * - darkMenuStyles: 鏆楅粦妯″紡涓嬬殑鑿滃崟鏍峰紡
 * - systemMainColor: 棰勮鐨勭郴缁熶富鑹插垪琛? * - fastEnter: 蹇€熷叆鍙ｉ厤缃? * - headerBar: 椤堕儴鏍忓姛鑳介厤缃? *
 * @module config
 * @author Art Design Pro Team
 */

import { MenuThemeEnum, MenuTypeEnum, SystemThemeEnum } from '@/enums/appEnum'
import { SystemConfig } from '@/types/config'
import { configImages } from './assets/images'
import fastEnterConfig from './modules/fastEnter'
import { headerBarConfig } from './modules/headerBar'

const appConfig: SystemConfig = {
  // 绯荤粺淇℃伅
  systemInfo: {
    name: 'PMX Admin'
  },
  // 绯荤粺涓婚
  systemThemeStyles: {
    [SystemThemeEnum.LIGHT]: { className: '' },
    [SystemThemeEnum.DARK]: { className: SystemThemeEnum.DARK }
  },
  // 绯荤粺涓婚鍒楄〃
  settingThemeList: [
    {
      name: 'Light',
      theme: SystemThemeEnum.LIGHT,
      color: ['#fff', '#fff'],
      leftLineColor: '#EDEEF0',
      rightLineColor: '#EDEEF0',
      img: configImages.themeStyles.light
    },
    {
      name: 'Dark',
      theme: SystemThemeEnum.DARK,
      color: ['#22252A'],
      leftLineColor: '#3F4257',
      rightLineColor: '#3F4257',
      img: configImages.themeStyles.dark
    },
    {
      name: 'System',
      theme: SystemThemeEnum.AUTO,
      color: ['#fff', '#22252A'],
      leftLineColor: '#EDEEF0',
      rightLineColor: '#3F4257',
      img: configImages.themeStyles.system
    }
  ],
  // 鑿滃崟甯冨眬鍒楄〃
  menuLayoutList: [
    { name: 'Left', value: MenuTypeEnum.LEFT, img: configImages.menuLayouts.vertical },
    { name: 'Top', value: MenuTypeEnum.TOP, img: configImages.menuLayouts.horizontal },
    { name: 'Mixed', value: MenuTypeEnum.TOP_LEFT, img: configImages.menuLayouts.mixed },
    { name: 'Dual Column', value: MenuTypeEnum.DUAL_MENU, img: configImages.menuLayouts.dualColumn }
  ],
  // 鑿滃崟涓婚鍒楄〃
  themeList: [
    {
      theme: MenuThemeEnum.DESIGN,
      background: '#FFFFFF',
      systemNameColor: 'var(--art-gray-800)',
      iconColor: '#6B6B6B',
      textColor: '#29343D',
      img: configImages.menuStyles.design
    },
    {
      theme: MenuThemeEnum.DARK,
      background: '#191A23',
      systemNameColor: '#D9DADB',
      iconColor: '#BABBBD',
      textColor: '#BABBBD',
      img: configImages.menuStyles.dark
    },
    {
      theme: MenuThemeEnum.LIGHT,
      background: '#ffffff',
      systemNameColor: 'var(--art-gray-800)',
      iconColor: '#6B6B6B',
      textColor: '#29343D',
      img: configImages.menuStyles.light
    }
  ],
  // 鏆楅粦妯″紡鑿滃崟鏍峰紡
  darkMenuStyles: [
    {
      theme: MenuThemeEnum.DARK,
      background: 'var(--default-box-color)',
      systemNameColor: '#DDDDDD',
      iconColor: '#BABBBD',
      textColor: 'rgba(#FFFFFF, 0.7)'
    }
  ],
  // 绯荤粺涓昏壊
  systemMainColor: [
    '#5D87FF',
    '#B48DF3',
    '#1D84FF',
    '#60C041',
    '#38C0FC',
    '#F9901F',
    '#FF80C8'
  ] as const,
  // 蹇€熷叆鍙ｉ厤缃?  fastEnter: fastEnterConfig,
  // 椤堕儴鏍忓姛鑳介厤缃?  headerBar: headerBarConfig
}

export default Object.freeze(appConfig)

