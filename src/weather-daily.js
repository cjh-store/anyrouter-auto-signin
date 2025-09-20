#!/usr/bin/env node

/**
 * 成都青羊区天气每日推送脚本
 */

import dotenv from 'dotenv';

// 必须先加载环境变量，再导入其他模块
dotenv.config();

import CaiyunWeatherService from './weather-caiyun.js';
import NotificationKit from './notify.js';

// 创建服务实例
const weatherService = new CaiyunWeatherService();
const notify = new NotificationKit();

/**
 * 主函数
 */
async function main() {
    try {
        console.log('[天气] 成都青羊区天气每日推送脚本启动');
        console.log(`[时间] 执行时间: ${new Date().toLocaleString('zh-CN')}`);

        // 获取天气信息
        console.log('[天气] 开始获取成都青羊区天气信息...');
        const weatherInfo = await weatherService.getWeatherInfo();

        // 格式化天气信息
        const weatherContent = weatherService.formatWeatherForEmail(weatherInfo);
        const weatherTips = weatherService.getWeatherTips(weatherInfo);

        // 构建完整的通知内容
        const timeInfo = `⏰ 推送时间: ${new Date().toLocaleString('zh-CN')}`;
        
        const header = [
            '🌤️ 成都青羊区天气预报',
            '= = = = = = = = = = = = = = = = = =',
            timeInfo,
            ''
        ];

        const footer = [
            '',
            '- - - - - - - - - - - - - - - -',
            '🤖 天气推送脚本生成'
        ];

        const fullWeatherContent = [
            ...header,
            weatherContent,
            weatherTips,
            ...footer
        ].join('\n');

        console.log('\n' + fullWeatherContent);

        // 发送天气通知
        let emailTitle = '🌤️ 成都天气预报';
        
        // 根据空气质量调整标题
        if (weatherInfo.airQuality && !weatherInfo.airQuality.error) {
            const aqi = parseInt(weatherInfo.airQuality.aqi);
            if (aqi > 150) {
                emailTitle += ' 🚨'; // 污染严重
            } else if (aqi > 100) {
                emailTitle += ' 😷'; // 轻度污染
            } else if (aqi > 50) {
                emailTitle += ' 🌬️'; // 良好
            } else {
                emailTitle += ' 🟢'; // 优秀
            }
        }

        await notify.pushMessage(emailTitle, fullWeatherContent, 'text', '🌤️ 天气推送助手');
        
        console.log('[天气] 天气信息推送完成');
        process.exit(0);

    } catch (error) {
        console.error('[失败] 天气推送过程中发生错误:', error.message);
        console.error(error.stack);

        // 尝试发送错误通知
        try {
            const errorMessage = [
                '⚠️ 天气推送过程中发生错误:',
                error.message,
                '',
                `⏰ 错误时间: ${new Date().toLocaleString('zh-CN')}`,
                '',
                '🔧 请检查网络连接或API服务状态'
            ].join('\n');

            await notify.pushMessage(
                '🚨 天气推送异常',
                errorMessage,
                'text',
                '🌤️ 天气推送助手'
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
    console.log('\n[警告] 天气推送程序被用户中断');
    process.exit(1);
});

// 运行主函数
main();