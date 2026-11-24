/**
 * 久坐健康提醒插件：按固定健康间隔定时提醒喝水与起身站立，默认开启。
 *
 * 注册斜杠命令 `/health`（on / off / status），并监听 `agent/created`：
 * 会话被打开/进入时自动创建两条循环提醒（幂等，无需手动 /health on）。
 *
 * @module @local/health-reminders
 */

// —— 固定健康间隔（不提供自定义配置）——
// 喝水：约每 60 分钟一杯，一天约 8 杯（≈ 2L）。
// 站立：每 30 分钟起身活动 1~2 分钟，打破久坐。
const WATER_EVERY_MINUTES = 60
const STAND_EVERY_MINUTES = 30

const WATER_TITLE = '💧 喝水提醒'
const STAND_TITLE = '🧍 站立活动提醒'

const WATER_PROMPT =
  '💧 喝水时间到：起身接一杯水（约 200ml）慢慢喝完。久坐人群建议每天 1.5~2L，少量多次，不要等到口渴才喝。'
const STAND_PROMPT =
  '🧍 久坐提醒：你已经连续坐了很久，请起身站立或走动 1~2 分钟，活动一下颈肩和腰部，顺便看看远处放松眼睛。'

/** 从已有提醒里挑出本插件创建的两条。 */
function ownRecords(records) {
  return records.filter((r) => r.title === WATER_TITLE || r.title === STAND_TITLE)
}

async function startReminders(schedule, sessionId) {
  const existing = ownRecords(await schedule.list({ sessionId }))
  const have = new Set(existing.map((r) => r.title))
  const lines = []

  if (have.has(WATER_TITLE)) {
    lines.push('喝水：已开启（跳过）')
  } else {
    try {
      await schedule.create(sessionId, {
        title: WATER_TITLE,
        prompt: WATER_PROMPT,
        every_seconds: WATER_EVERY_MINUTES * 60,
      })
      lines.push(`喝水：每 ${WATER_EVERY_MINUTES} 分钟提醒一次 ✅`)
    } catch (error) {
      lines.push(`喝水提醒创建失败：${String(error && error.message ? error.message : error)}`)
    }
  }

  if (have.has(STAND_TITLE)) {
    lines.push('站立：已开启（跳过）')
  } else {
    try {
      await schedule.create(sessionId, {
        title: STAND_TITLE,
        prompt: STAND_PROMPT,
        every_seconds: STAND_EVERY_MINUTES * 60,
      })
      lines.push(`站立：每 ${STAND_EVERY_MINUTES} 分钟提醒一次 ✅`)
    } catch (error) {
      lines.push(`站立提醒创建失败：${String(error && error.message ? error.message : error)}`)
    }
  }

  return { kind: 'success', text: `健康提醒已开启：\n${lines.join('\n')}` }
}

async function stopReminders(schedule, sessionId) {
  const targets = ownRecords(await schedule.list({ sessionId }))
  if (targets.length === 0) {
    return { kind: 'success', text: '当前没有开启的健康提醒。' }
  }
  let removed = 0
  for (const record of targets) {
    try {
      const result = await schedule.delete({ sessionId, id: record.id })
      if (result && result.deleted) removed += 1
    } catch {
      /* 单条失败不阻断其余删除 */
    }
  }
  return { kind: 'success', text: `已关闭 ${removed} 条健康提醒。` }
}

async function renderStatus(schedule, sessionId) {
  const mine = ownRecords(await schedule.list({ sessionId }))
  if (mine.length === 0) {
    return { kind: 'success', text: '健康提醒未开启。输入 /health on 开始。' }
  }
  const lines = mine.map((r) => {
    const every = r.kind === 'every' ? `，每 ${Math.round(r.everySeconds / 60)} 分钟` : ''
    return `· ${r.title}${every}`
  })
  return { kind: 'success', text: `当前健康提醒：\n${lines.join('\n')}\n\n输入 /health off 关闭。` }
}

export function apply(ctx) {
  ctx.inject(['commands', 'schedule'], (scope) => {
    scope.commands.register({
      name: 'health',
      description: '久坐健康提醒：定时提醒喝水与起身站立（默认开启）',
      input: { hint: 'on | off | status' },
      handler: async (invocation) => {
        const sessionId = invocation.agent.id
        const parts = (invocation.rawInput || '').trim().split(/\s+/).filter(Boolean)
        const action = (parts[0] || '').toLowerCase()

        if (action === '' || action === 'status') {
          return renderStatus(scope.schedule, sessionId)
        }
        if (action === 'off' || action === 'stop') {
          return stopReminders(scope.schedule, sessionId)
        }
        if (action === 'on' || action === 'start') {
          return startReminders(scope.schedule, sessionId)
        }
        return { kind: 'error', text: '用法：/health on | off | status' }
      },
    })

    // 默认开启：会话进入时自动创建提醒（幂等）。子代理等不可投递会话由 schedule.create 拒绝并被忽略。
    ctx.on('agent/created', async (payload) => {
      try {
        await startReminders(scope.schedule, payload.agent.id)
      } catch {
        /* 不可投递/临时失败：静默，等待下次触发 */
      }
    })
  })
}
