/**
 * health-reminders 客户端半边：在浏览器里弹窗提醒。
 * 与 index.js（Host 半边）的固定间隔保持一致：喝水 60 分钟 / 站立 30 分钟。
 */
window.__ModuleLoader__.load({
  id: '@zhnew2/health-reminders',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useState, useEffect } = React;

    // 固定健康间隔（与 Host 半边 index.js 同步）
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
        /* 通知失败不影响应用内 toast */
      }
    }

    function HealthToast() {
      const [toast, setToast] = useState(null);

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
          setToast(r);
          if (dismissTimer) clearTimeout(dismissTimer);
          dismissTimer = setTimeout(() => setToast(null), 8000);
        };
        for (const r of REMINDERS) {
          timers.push(setInterval(() => fire(r), r.everyMs));
        }
        // 自检：加载后 ~2.5s 弹一次确认，便于验证弹窗可用
        const selfTest = setTimeout(() => {
          setToast({
            title: '✅ 健康提醒已开启',
            body: '每 60 分钟提醒喝水、每 30 分钟提醒站立。',
          });
          if (dismissTimer) clearTimeout(dismissTimer);
          dismissTimer = setTimeout(() => setToast(null), 8000);
        }, 2500);
        return () => {
          clearTimeout(selfTest);
          for (const t of timers) clearInterval(t);
          if (dismissTimer) clearTimeout(dismissTimer);
        };
      }, []);

      if (!toast) return null;
      return h(
        'div',
        {
          role: 'status',
          style: {
            position: 'fixed',
            top: 18,
            right: 18,
            zIndex: 2147483000,
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start',
            background: 'rgba(30, 34, 46, 0.96)',
            color: '#ffffff',
            borderRadius: 14,
            padding: '14px 16px',
            maxWidth: 380,
            boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
            fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
            pointerEvents: 'auto',
          },
        },
        h('div', { style: { fontSize: 22, lineHeight: 1 } }, '🔔'),
        h(
          'div',
          null,
          h('div', { style: { fontWeight: 600, fontSize: 15, marginBottom: 4 } }, toast.title),
          h('div', { style: { fontSize: 13, opacity: 0.88, lineHeight: 1.5 } }, toast.body),
        ),
        h(
          'button',
          {
            onClick: () => setToast(null),
            'aria-label': '关闭',
            style: {
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.6)',
              fontSize: 18,
              cursor: 'pointer',
              padding: '0 2px',
              lineHeight: 1,
            },
          },
          '×',
        ),
      );
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.slots.inject('shell.overlay', () =>
          ctx.slots.register(
            { name: 'shell.overlay', id: 'health-reminders-toast', order: 10 },
            HealthToast,
          ),
        );
      },
    };
  },
});
