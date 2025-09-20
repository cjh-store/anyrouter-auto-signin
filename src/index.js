#!/usr/bin/env node

/**
 * AnyRouter.top 自动签到脚本 - Node.js 版
 */

import dotenv from 'dotenv';

// 必须先加载环境变量，再导入其他模块
dotenv.config();

import AnyRouterChecker from './checkin.js';
import NotificationKit from './notify.js';

// 创建通知实例
const notify = new NotificationKit();

/**
 * 主函数
 */
async function main() {
	try {
		console.log('[系统] AnyRouter.top 多账号自动签到脚本启动 (Node.js 版)');
		console.log(`[时间] 执行时间: ${new Date().toLocaleString('zh-CN')}`);

		// 创建签到实例
		const checker = new AnyRouterChecker();

		// 执行签到
		const checkResult = await checker.run();

		if (!checkResult.success && checkResult.results.length === 0) {
			console.log('[失败] 无法加载账号配置，程序退出');
			process.exit(1);
		}

		// 构建美化的通知内容
		const notificationContent = [];
		const results = checkResult.results;

		// 添加每个账号的结果
		for (const result of results) {
			const status = result.success ? '✅' : '❌';
			const statusText = result.success ? '成功' : '失败';
			
			let accountResult = `${status} 账号 ${result.account.replace('账号 ', '')} - ${statusText}`;
			
			if (result.userInfo) {
				// 格式化余额信息，添加钱袋子emoji
				const formattedUserInfo = result.userInfo.replace(':money:', '💰');
				accountResult += `\n${formattedUserInfo}`;
			}
			
			if (result.error) {
				accountResult += `\n🔴 ${result.error.substring(0, 50)}...`;
			}
			
			notificationContent.push(accountResult);
		}

		// 构建美化的统计信息
		const successRate = ((checkResult.successCount / checkResult.totalCount) * 100).toFixed(0);
		const summary = [
			'📊 签到统计',
			'- - - - - - - - - - - - - - - -',
			`✅ 成功: ${checkResult.successCount}/${checkResult.totalCount} 账号`,
			`❌ 失败: ${checkResult.totalCount - checkResult.successCount}/${checkResult.totalCount} 账号`,
			`📈 成功率: ${successRate}%`
		];

		// 添加整体状态
		let overallStatus;
		if (checkResult.successCount === checkResult.totalCount) {
			overallStatus = '🎉 所有账号签到成功！';
		} else if (checkResult.successCount > 0) {
			overallStatus = '⚠️  部分账号签到成功';
		} else {
			overallStatus = '🚨 所有账号签到失败';
		}
		summary.push('', overallStatus);

		// 时间信息
		const timeInfo = `⏰ 执行时间: ${new Date().toLocaleString('zh-CN')}`;

		// 组合完整的通知内容
		const header = [
			'📬 AnyRouter 自动签到报告',
			'= = = = = = = = = = = = = = = = = =',
			timeInfo,
			''
		];

		const footer = [
			'',
			'- - - - - - - - - - - - - - - -',
			'🤖 自动签到脚本生成'
		];

		const fullNotifyContent = [
			...header,
			...notificationContent,
			'',
			...summary,
			...footer
		].join('\n');

		console.log('\n' + fullNotifyContent);

		// 发送通知
		const emailTitle = `AnyRouter签到 ${checkResult.successCount === checkResult.totalCount ? '🎉' : checkResult.successCount > 0 ? '⚠️' : '🚨'}`;
		await notify.pushMessage(emailTitle, fullNotifyContent, 'text');

		// 设置退出码
		process.exit(checkResult.successCount > 0 ? 0 : 1);

	} catch (error) {
		console.error('[失败] 程序执行过程中发生错误:', error.message);
		console.error(error.stack);

		// 尝试发送错误通知
		try {
			const errorMessage = [
				`⚠️ 签到过程中发生错误:`,
				error.message
			].join('\n');

			await notify.pushMessage(
				'AnyRouter 签到错误 🚨',
				errorMessage,
				'text'
			);
		} catch (notifyError) {
			console.error('[失败] 发送错误通知失败:', notifyError.message);
		}

		process.exit(1);
	}
}

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
	console.error('[致命错误] 未捕获的异常:', error);
	process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
	console.error('[致命错误] 未处理的 Promise 拒绝:', reason);
	process.exit(1);
});

// 处理中断信号
process.on('SIGINT', () => {
	console.log('\n[警告] 程序被用户中断');
	process.exit(1);
});

// 运行主函数
main();