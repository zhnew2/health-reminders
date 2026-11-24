/**
 * health-reminders 客户端半边：居中模态弹窗 + 浏览器系统通知。
 * 与 Host 半边保持一致：喝水 60 分钟 / 站立 30 分钟。
 */
window.__ModuleLoader__.load({
  id: '@zhnew2/health-reminders',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useState, useEffect } = React;

    // 固定健康间隔（与 index.js 同步）
    const REMINDERS = [
      {
        title: '💧 喝水提醒',
        body: '起身接一杯水（约 200ml）慢慢喝完，别等到口渴再喝。',
        everyMs: 60 * 60 * 1000,
      },
      {
        title: '🧍 站立提醒',
        body: '起身站立或走动 1~2 分钟，活动颈肩腰，看看远处放松眼睛。',
        everyMs: 30 * 60 * 1000,
      },
    ];

    function sendNotification(title, body) {
      try {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification(title, { body, tag: 'health-reminders' });
        }
      } catch {
        /* 通知失败不影响应用内弹窗 */
      }
    }

    function HealthModal() {
      const [modal, setModal] = useState(null);

      useEffect(() => {
        // 一次性申请浏览器通知权限
        if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
          try {
            Notification.requestPermission();
          } catch {
            /* ignore */
          }
        }

        let dismissTimer = null;
        const timers = [];
        const fire = (r) => {
          sendNotification(r.title, r.body);
          setModal(r);
          if (dismissTimer) clearTimeout(dismissTimer);
          dismissTimer = setTimeout(() => setModal(null), 30000);
        };
        for (const r of REMINDERS) {
          timers.push(setInterval(() => fire(r), r.everyMs));
        }
        // 自检：加载后 ~2s 弹一次，确认弹窗可用
        const selfTest = setTimeout(() => {
          setModal({
            title: '✅ 健康提醒已开启',
            body: '之后每 60 分钟提醒喝水、每 30 分钟提醒站立。',
          });
          dismissTimer = setTimeout(() => setModal(null), 8000);
        }, 2000);
        return () => {
          clearTimeout(selfTest);
          for (const t of timers) clearInterval(t);
          if (dismissTimer) clearTimeout(dismissTimer);
        };
      }, []);

      if (!modal) return null;
      return h(
        'div',
        {
          role: 'dialog',
          'aria-modal': 'true',
          style: {
            position: 'fixed',
            inset: 0,
            zIndex: 2147483000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.45)',
          },
        },
        h(
          'div',
          {
            style: {
              background: '#ffffff',
              color: '#1f2430',
              borderRadius: 16,
              padding: '24px 28px',
              maxWidth: 420,
              width: 'calc(100vw - 64px)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
              fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
            },
          },
          h('div', { style: { fontSize: 26, marginBottom: 10 } }, modal.title),
          h('div', { style: { fontSize: 15, lineHeight: 1.6, opacity: 0.85 } }, modal.body),
          h(
            'button',
            {
              onClick: () => setModal(null),
              style: {
                marginTop: 20,
                width: '100%',
                background: '#3aa0ff',
                color: '#ffffff',
                border: 'none',
                borderRadius: 10,
                padding: '10px 0',
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
              },
            },
            '知道了',
          ),
        ),
      );
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.slots.inject('shell.overlay', () =>
          ctx.slots.register(
            { name: 'shell.overlay', id: 'health-reminders-toast', order: 10 },
            HealthModal,
          ),
        );
      },
    };
  },
});
