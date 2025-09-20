/**
 * 通知模块
 */

import nodemailer from 'nodemailer';
import axios from 'axios';

class NotificationKit {
	constructor() {
		this.emailUser = process.env.EMAIL_USER || '';
		this.emailPass = process.env.EMAIL_PASS || '';
		this.emailTo = process.env.EMAIL_TO || '';
		this.pushplusToken = process.env.PUSHPLUS_TOKEN;
		this.serverPushKey = process.env.SERVERPUSHKEY;
		this.dingdingWebhook = process.env.DINGDING_WEBHOOK;
		this.feishuWebhook = process.env.FEISHU_WEBHOOK;
		this.weixinWebhook = process.env.WEIXIN_WEBHOOK;
	}

	/**
	 * 发送邮件通知
	 */
	async sendEmail(title, content, msgType = 'text') {
		if (!this.emailUser || !this.emailPass || !this.emailTo) {
			throw new Error('邮箱配置未设置');
		}

		const transporter = nodemailer.createTransport({
			host: `smtp.${this.emailUser.split('@')[1]}`,
			port: 465,
			secure: true,
			auth: {
				user: this.emailUser,
				pass: this.emailPass
			}
		});

		const mailOptions = {
			from: `🤖 AnyRouter 自动签到助手 <${this.emailUser}>`,
			to: this.emailTo,
			subject: title
		};

		if (msgType === 'html') {
			mailOptions.html = content;
		} else {
			mailOptions.text = content;
		}

		await transporter.sendMail(mailOptions);
	}

	/**
	 * 发送 PushPlus 通知
	 */
	async sendPushplus(title, content) {
		if (!this.pushplusToken) {
			throw new Error('PushPlus Token 未配置');
		}

		const data = {
			token: this.pushplusToken,
			title: title,
			content: content,
			template: 'html'
		};

		await axios.post('http://www.pushplus.plus/send', data, {
			timeout: 30000
		});
	}

	/**
	 * 发送 Server酱 通知
	 */
	async sendServerPush(title, content) {
		if (!this.serverPushKey) {
			throw new Error('Server酱 key 未配置');
		}

		const data = {
			title: title,
			desp: content
		};

		await axios.post(
			`https://sctapi.ftqq.com/${this.serverPushKey}.send`,
			data,
			{ timeout: 30000 }
		);
	}

	/**
	 * 发送钉钉通知
	 */
	async sendDingtalk(title, content) {
		if (!this.dingdingWebhook) {
			throw new Error('钉钉 Webhook 未配置');
		}

		const data = {
			msgtype: 'text',
			text: {
				content: `${title}\n${content}`
			}
		};

		await axios.post(this.dingdingWebhook, data, {
			timeout: 30000
		});
	}

	/**
	 * 发送飞书通知
	 */
	async sendFeishu(title, content) {
		if (!this.feishuWebhook) {
			throw new Error('飞书 Webhook 未配置');
		}

		const data = {
			msg_type: 'interactive',
			card: {
				elements: [
					{
						tag: 'markdown',
						content: content,
						text_align: 'left'
					}
				],
				header: {
					template: 'blue',
					title: {
						content: title,
						tag: 'plain_text'
					}
				}
			}
		};

		await axios.post(this.feishuWebhook, data, {
			timeout: 30000
		});
	}

	/**
	 * 发送企业微信通知
	 */
	async sendWecom(title, content) {
		if (!this.weixinWebhook) {
			throw new Error('企业微信 Webhook 未配置');
		}

		const data = {
			msgtype: 'text',
			text: {
				content: `${title}\n${content}`
			}
		};

		await axios.post(this.weixinWebhook, data, {
			timeout: 30000
		});
	}

	/**
	 * 推送消息到所有配置的通知渠道
	 */
	async pushMessage(title, content, msgType = 'text') {
		const notifications = [
			{ name: '邮件', fn: () => this.sendEmail(title, content, msgType) },
			{ name: 'PushPlus', fn: () => this.sendPushplus(title, content) },
			{ name: 'Server酱', fn: () => this.sendServerPush(title, content) },
			{ name: '钉钉', fn: () => this.sendDingtalk(title, content) },
			{ name: '飞书', fn: () => this.sendFeishu(title, content) },
			{ name: '企业微信', fn: () => this.sendWecom(title, content) }
		];

		for (const { name, fn } of notifications) {
			try {
				await fn();
				console.log(`[${name}]: 消息推送成功!`);
			} catch (error) {
				// 跳过未配置的通知方式
				if (error.message.includes('未配置')) {
					continue;
				}
				console.log(`[${name}]: 消息推送失败! 原因: ${error.message}`);
			}
		}
	}
}

export default NotificationKit;