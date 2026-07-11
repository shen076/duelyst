# duelyst-player

用于预览 Duelyst plist spritesheet 动画的播放器，资源来自以下目录：

- `units`
- `fx`
- `icons`
- `particles`

## 项目启动

```sh
npm install
```

### 开发模式

```sh
npm run dev
```

### 更新 unit attack 关系

播放器会读取根目录的 `unit-attacks.json`，在播放 `units` 的 `attack` action 时叠加第一份
`UnitAttackedFX` 并播放 `attack` SFX。资源或卡牌配置变化后运行：

```sh
npm run generate:attacks
```

生成脚本扫描 `app/resources/units`、`app/sdk/cards/factory`、`app/data/resources.js`
和 `app/data/fx.js`。没有可匹配 FX/SFX 的 unit 仍会保留 JSON 条目，播放器会忽略缺失部分。

### 类型检查并构建生产包

```sh
npm run build
```

## Action 统计

下表使用当前播放器里的 action 解析规则：

1. 如果 frame key 以 plist 文件名开头，则先移除这个前缀。
2. 使用末尾 `_数字` 之前的文本作为 action。
3. 如果无法解析出 action，则归为 `noPrefix`。

这里的“文件出现次数”指有多少个 plist 文件使用了该 action，不是该 action 下有多少帧。Action 枚举值总数：107。

| Action                           | 文件出现次数 | 文件列表（次数 < 5）                                                                                 |
| -------------------------------- | -----------: | ---------------------------------------------------------------------------------------------------- |
| `idle`                           |          698 |                                                                                                      |
| `attack`                         |          691 |                                                                                                      |
| `death`                          |          689 |                                                                                                      |
| `breathing`                      |          688 |                                                                                                      |
| `hit`                            |          680 |                                                                                                      |
| `run`                            |          666 |                                                                                                      |
| `noPrefix`                       |          553 |                                                                                                      |
| `active`                         |          370 |                                                                                                      |
| `castend`                        |           40 |                                                                                                      |
| `castloop`                       |           39 |                                                                                                      |
| `caststart`                      |           39 |                                                                                                      |
| `cast`                           |           38 |                                                                                                      |
| `projectile`                     |           31 |                                                                                                      |
| `hurt`                           |            8 |                                                                                                      |
| `breathe`                        |            3 | `units/f5_silitharyoung.plist`<br>`units/neutral_purgatos.plist`<br>`units/neutral_silverbeak.plist` |
| `breath`                         |            2 | `units/boss_soulstealer.plist`<br>`units/f2_deathphantom.plist`                                      |
| `crawl`                          |            2 | `units/boss_soulstealer.plist`<br>`units/f2_deathphantom.plist`                                      |
| `damage`                         |            2 | `units/f4_crawler.plist`<br>`units/f4_gloomchaser.plist`                                             |
| `explode`                        |            2 | `units/neutral_monster_explodingdemon.plist`<br>`units/neutral_monsterexplodingdemon.plist`          |
| `fx_fairiefirepurple`            |            2 | `fx/fx_fairiefire.plist`<br>`fx/fx_fairiefire_old.plist`                                             |
| `fx_fairiefirered`               |            2 | `fx/fx_fairiefire.plist`<br>`fx/fx_fairiefire_old.plist`                                             |
| `fx_impactbluemedium`            |            2 | `fx/fx_impact.plist`<br>`fx/fx_impactblue.plist`                                                     |
| `1turn`                          |            1 | `fx/fx_doom.plist`                                                                                   |
| `2turns`                         |            1 | `fx/fx_doom.plist`                                                                                   |
| `3turns`                         |            1 | `fx/fx_doom.plist`                                                                                   |
| `action`                         |            1 | `icons/f3_thoughtexchange.plist`                                                                     |
| `active_1`                       |            1 | `icons/artifact_f4_ragechackram.plist`                                                               |
| `appear`                         |            1 | `fx/f6_flashfreeze.plist`                                                                            |
| `attack_projectile`              |            1 | `units/neutral_ion.plist`                                                                            |
| `burst`                          |            1 | `fx/fx_cleanse.plist`                                                                                |
| `castendsample`                  |            1 | `units/f1_3rdgeneral.plist`                                                                          |
| `casting`                        |            1 | `units/f5_altgeneral.plist`                                                                          |
| `castLoop`                       |            1 | `units/f3_3rdgeneral.plist`                                                                          |
| `castStart`                      |            1 | `units/f3_3rdgeneral.plist`                                                                          |
| `death2`                         |            1 | `units/f4_abomination.plist`                                                                         |
| `die`                            |            1 | `units/f2_chakriavatar.plist`                                                                        |
| `disappear`                      |            1 | `fx/f6_flashfreeze.plist`                                                                            |
| `distortion_hex_shield`          |            1 | `fx/fx_distortion_hex_shield.plist`                                                                  |
| `distortion_water_bubble`        |            1 | `fx/fx_distortion_water_bubble.plist`                                                                |
| `f2_hammonbladeseeker_attack`    |            1 | `units/f2_hammonnladeseeker.plist`                                                                   |
| `f2_hammonbladeseeker_breathing` |            1 | `units/f2_hammonnladeseeker.plist`                                                                   |
| `f2_hammonbladeseeker_death`     |            1 | `units/f2_hammonnladeseeker.plist`                                                                   |
| `f2_hammonbladeseeker_hit`       |            1 | `units/f2_hammonnladeseeker.plist`                                                                   |
| `f2_hammonbladeseeker_idle`      |            1 | `units/f2_hammonnladeseeker.plist`                                                                   |
| `f2_hammonbladeseeker_run`       |            1 | `units/f2_hammonnladeseeker.plist`                                                                   |
| `fx_bloodbig`                    |            1 | `fx/fx_blood_explosion.plist`                                                                        |
| `fx_bloodground2`                |            1 | `fx/fx_bloodground.plist`                                                                            |
| `fx_bloodground3`                |            1 | `fx/fx_bloodground.plist`                                                                            |
| `fx_bloodground4`                |            1 | `fx/fx_bloodground.plist`                                                                            |
| `fx_bloodmedium`                 |            1 | `fx/fx_blood_explosion.plist`                                                                        |
| `fx_blueplasma`                  |            1 | `fx/fx_plasma.plist`                                                                                 |
| `fx_chainlightningblue`          |            1 | `fx/fx_chainlightning.plist`                                                                         |
| `fx_collisionsparks`             |            1 | `fx/fx_collision.plist`                                                                              |
| `fx_collisionsparksblue`         |            1 | `fx/fx_collision.plist`                                                                              |
| `fx_collisionsparksgreen`        |            1 | `fx/fx_collisionsparkgreen.plist`                                                                    |
| `fx_collisionsparksred`          |            1 | `fx/fx_collisionsparkred.plist`                                                                      |
| `fx_collisionsparksrpurple`      |            1 | `fx/fx_collisionsparkpurple.plist`                                                                   |
| `fx_explosionbig`                |            1 | `fx/fx_blood_explosion.plist`                                                                        |
| `fx_explosionblueelectrical`     |            1 | `fx/fx_electrical.plist`                                                                             |
| `fx_explosiondarkplume`          |            1 | `fx/fx_smoke.plist`                                                                                  |
| `fx_explosionmedium`             |            1 | `fx/fx_blood_explosion.plist`                                                                        |
| `fx_explosionmediumblue_ground`  |            1 | `fx/fx_explosionblue.plist`                                                                          |
| `fx_explosionwhitesmokemedium`   |            1 | `fx/fx_smoke.plist`                                                                                  |
| `fx_f1casterprojectile`          |            1 | `fx/fx_f1_casterprojectile.plist`                                                                    |
| `fx_f1casterprojectilecharge`    |            1 | `fx/fx_f1_casterprojectile.plist`                                                                    |
| `fx_f2_general_attack`           |            1 | `fx/fx_f2BK.plist`                                                                                   |
| `fx_f2_special_devour`           |            1 | `fx/fx_f2BK.plist`                                                                                   |
| `fx_f2_support_syphon`           |            1 | `fx/fx_f2BK.plist`                                                                                   |
| `fx_fairiefireblack`             |            1 | `fx/fx_fairiefire.plist`                                                                             |
| `fx_fairiefireblue`              |            1 | `fx/fx_fairiefire.plist`                                                                             |
| `fx_fairiefiregreen`             |            1 | `fx/fx_fairiefire.plist`                                                                             |
| `fx_fairiefireyellow`            |            1 | `fx/fx_fairiefire.plist`                                                                             |
| `fx_floatingshield`              |            1 | `fx/fx_defense.plist`                                                                                |
| `fx_footstepdust`                |            1 | `fx/fx_smoke.plist`                                                                                  |
| `fx_forcefield`                  |            1 | `fx/fx_defense.plist`                                                                                |
| `fx_impactbluebig`               |            1 | `fx/fx_impactblue.plist`                                                                             |
| `fx_impactbluesmall`             |            1 | `fx/fx_impactblue.plist`                                                                             |
| `fx_impactbrightwhitemedium`     |            1 | `fx/fx_impact2.plist`                                                                                |
| `fx_impactgreenbig`              |            1 | `fx/fx_impactgreen.plist`                                                                            |
| `fx_impactgreenmedium`           |            1 | `fx/fx_impactgreen.plist`                                                                            |
| `fx_impactgreensmall`            |            1 | `fx/fx_impactgreen.plist`                                                                            |
| `fx_impactorangebig`             |            1 | `fx/fx_impact.plist`                                                                                 |
| `fx_impactorangemedium`          |            1 | `fx/fx_impact.plist`                                                                                 |
| `fx_impactorangesmall`           |            1 | `fx/fx_impact2.plist`                                                                                |
| `fx_impactredbig`                |            1 | `fx/fx_impactred.plist`                                                                              |
| `fx_impactredmedium`             |            1 | `fx/fx_impactred.plist`                                                                              |
| `fx_impactredsmall`              |            1 | `fx/fx_impactred.plist`                                                                              |
| `fx_smokeground`                 |            1 | `fx/fx_smoke2.plist`                                                                                 |
| `fx_swirlloop`                   |            1 | `fx/fx_swirl.plist`                                                                                  |
| `fx_whitehotbig`                 |            1 | `fx/fx_whiteexplosion.plist`                                                                         |
| `fx_whitehotmedium`              |            1 | `fx/fx_whiteexplosion.plist`                                                                         |
| `general_attack`                 |            1 | `fx/fx_f2.plist`                                                                                     |
| `icon_f3_astralflood_active`     |            1 | `icons/icon_f3_astraflood.plist`                                                                     |
| `move`                           |            1 | `units/f5_silitharyoung.plist`                                                                       |
| `movement`                       |            1 | `units/neutral_golem_crossbones.plist`                                                               |
| `neutral_dilotas_breathing`      |            1 | `units/neutral_dilotas_attack.plist`                                                                 |
| `neutral_dilotas_death`          |            1 | `units/neutral_dilotas_attack.plist`                                                                 |
| `neutral_dilotas_hit`            |            1 | `units/neutral_dilotas_attack.plist`                                                                 |
| `neutral_dilotas_idle`           |            1 | `units/neutral_dilotas_attack.plist`                                                                 |
| `neutral_dilotas_run`            |            1 | `units/neutral_dilotas_attack.plist`                                                                 |
| `open`                           |            1 | `units/f5_egg.plist`                                                                                 |
| `ray`                            |            1 | `particles/rays.plist`                                                                               |
| `ripples`                        |            1 | `fx/fx_cleanse.plist`                                                                                |
| `spawn`                          |            1 | `fx/fx_shadowcreep.plist`                                                                            |
| `special_devour`                 |            1 | `fx/fx_f2.plist`                                                                                     |
| `support_syphon`                 |            1 | `fx/fx_f2.plist`                                                                                     |
| `t`                              |            1 | `fx/fx_f4_wraithlingfury.plist`                                                                      |
