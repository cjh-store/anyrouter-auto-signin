/**
 * 彩云天气模块
 */

import axios from 'axios';

class CaiyunWeatherService {
    constructor() {
        this.location = '成都青羊区';
        this.apiToken = 'lFUrEMUF0OYyKk8n';
        this.latitude = 30.67; // 成都青羊区纬度
        this.longitude = 104.06; // 成都青羊区经度
        this.baseUrl = 'https://api.caiyunapp.com/v2.6';
        this.isDebugMode = false; // 关闭调试模式
    }

    /**
     * 调试日志输出
     */
    debugLog(message) {
        if (this.isDebugMode) {
            console.log(`[DEBUG] ${message}`);
        }
    }

    /**
     * 获取天气信息
     */
    async getWeatherInfo() {
        try {
            console.log(`[彩云天气] 正在获取${this.location}天气信息...`);
            this.debugLog(`API Token: ${this.apiToken.substring(0, 8)}***`);
            this.debugLog(`坐标: ${this.longitude}, ${this.latitude}`);

            // 并行获取天气和空气质量数据
            const [weatherData, airQualityData] = await Promise.allSettled([
                this.getCaiyunWeatherData(),
                this.getAirQualityInfo()
            ]);

            let weatherInfo = null;
            let airQuality = null;

            // 处理天气数据
            if (weatherData.status === 'fulfilled') {
                weatherInfo = weatherData.value;
            } else {
                console.log(`[彩云天气] 天气数据获取失败: ${weatherData.reason}`);
                weatherInfo = await this.getWeatherFallback();
            }

            // 处理空气质量数据
            if (airQualityData.status === 'fulfilled') {
                airQuality = airQualityData.value;
            } else {
                console.log(`[空气] 空气质量数据获取失败: ${airQualityData.reason}`);
                airQuality = { error: true, message: '空气质量数据暂不可用' };
            }

            // 合并数据
            if (weatherInfo && !weatherInfo.error) {
                weatherInfo.airQuality = airQuality;
            }

            return weatherInfo;

        } catch (error) {
            console.log(`[彩云天气] 获取天气信息失败: ${error.message}`);
            return this.getWeatherFallback();
        }
    }

    /**
     * 获取彩云天气数据
     */
    async getCaiyunWeatherData() {
        const url = `${this.baseUrl}/${this.apiToken}/${this.longitude},${this.latitude}/weather`;
        
        this.debugLog(`请求URL: ${url}`);
        
        const response = await axios.get(url, {
            params: {
                alert: true,
                dailysteps: 7,
                hourlysteps: 72
            },
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        this.debugLog(`API响应状态: ${response.status}`);
        this.debugLog(`API响应数据: ${JSON.stringify(response.data?.status)}`);

        if (response.status === 200 && response.data && response.data.status === 'ok') {
            return this.formatCaiyunData(response.data);
        } else {
            throw new Error('彩云天气API响应异常');
        }
    }

    /**
     * 格式化彩云天气数据
     */
    formatCaiyunData(data) {
        try {
            const result = data.result;
            const realtime = result.realtime;
            const daily = result.daily;
            const hourly = result.hourly;

            // 当前天气
            const currentTemp = Math.round(realtime.temperature);
            const currentDesc = this.getWeatherDescription(realtime.skycon);
            const humidity = Math.round(realtime.humidity * 100);
            const windSpeed = Math.round(realtime.wind.speed * 3.6); // m/s 转 km/h
            const windDirection = this.getWindDirection(realtime.wind.direction);
            const feelLike = Math.round(realtime.apparent_temperature);
            const visibility = realtime.visibility || 0; // 能见度 km
            const pressure = Math.round(realtime.pressure / 100); // Pa 转 hPa
            const cloudRate = Math.round(realtime.cloudrate * 100); // 云量百分比

            // 实时生活指数
            const realtimeLifeIndex = realtime.life_index || {};
            const currentUVIndex = realtimeLifeIndex.ultraviolet ? 
                realtimeLifeIndex.ultraviolet.desc : '未知';
            const currentComfort = realtimeLifeIndex.comfort ? 
                realtimeLifeIndex.comfort.desc : '未知';

            // 3天天气预报数据
            const threeDayForecast = [];
            const dayNames = ['今日', '明日', '后日'];
            
            for (let i = 0; i < 3 && i < daily.skycon.length; i++) {
                const weather = daily.skycon[i];
                const temp = daily.temperature[i];
                const uv = daily.ultraviolet && daily.ultraviolet[i] ? daily.ultraviolet[i] : null;
                
                // 获取日期
                const date = new Date(weather.date);
                const monthDay = `${date.getMonth() + 1}/${date.getDate()}`;
                
                threeDayForecast.push({
                    day: dayNames[i],
                    date: monthDay,
                    maxTemp: Math.round(temp.max),
                    minTemp: Math.round(temp.min),
                    description: this.getWeatherDescription(weather.value),
                    uvIndex: uv ? Math.round(uv.max) : '未知'
                });
            }

            // 兼容原有代码，保留今日和明日数据
            const todayData = threeDayForecast[0] || {};
            const tomorrowData = threeDayForecast[1] || {};

            // UV指数
            const uvIndex = daily.ultraviolet && daily.ultraviolet[0] ? 
                Math.round(daily.ultraviolet[0].max) : '未知';

            // 生活指数（今日）
            const lifeIndex = daily.life_index || {};
            const todayUVIndex = lifeIndex.ultraviolet && lifeIndex.ultraviolet[0] ? 
                lifeIndex.ultraviolet[0].desc : '未知';
            const todayColdRisk = lifeIndex.coldRisk && lifeIndex.coldRisk[0] ? 
                lifeIndex.coldRisk[0].desc : '未知';
            const todayDressing = lifeIndex.dressing && lifeIndex.dressing[0] ? 
                lifeIndex.dressing[0].desc : '未知';
            const todayCarWashing = lifeIndex.carWashing && lifeIndex.carWashing[0] ? 
                lifeIndex.carWashing[0].desc : '未知';

            // 天气关键描述
            const forecastKeypoint = result.forecast_keypoint || '';

            const weatherInfo = {
                location: this.location,
                current: {
                    temperature: currentTemp,
                    description: currentDesc,
                    humidity: humidity,
                    windSpeed: windSpeed,
                    windDirection: windDirection,
                    feelsLike: feelLike,
                    visibility: visibility,
                    pressure: pressure,
                    cloudRate: cloudRate,
                    uvIndex: currentUVIndex,
                    comfort: currentComfort
                },
                threeDayForecast: threeDayForecast,
                today: {
                    maxTemp: todayData.maxTemp || 0,
                    minTemp: todayData.minTemp || 0,
                    description: todayData.description || '未知',
                    uvIndex: uvIndex,
                    uvDesc: todayUVIndex,
                    coldRisk: todayColdRisk,
                    dressing: todayDressing,
                    carWashing: todayCarWashing
                },
                tomorrow: {
                    maxTemp: tomorrowData.maxTemp || 0,
                    minTemp: tomorrowData.minTemp || 0,
                    description: tomorrowData.description || '未知'
                },
                hourly: hourly, // 添加小时级数据
                forecastKeypoint: forecastKeypoint, // 天气关键描述
                alerts: this.formatAlerts(result.alert || {})
            };

            console.log('[彩云天气] 天气信息获取成功');
            this.debugLog(`天气数据: ${JSON.stringify(weatherInfo, null, 2)}`);
            return weatherInfo;

        } catch (error) {
            console.log(`[彩云天气] 解析天气数据失败: ${error.message}`);
            return this.getWeatherFallback();
        }
    }

    /**
     * 将风向角度转换为中文描述
     */
    getWindDirection(degree) {
        const directions = [
            '北风', '东北风', '东风', '东南风',
            '南风', '西南风', '西风', '西北风'
        ];
        const index = Math.round(degree / 45) % 8;
        return directions[index];
    }

    /**
     * 将彩云天气代码转换为中文描述
     */
    getWeatherDescription(skycon) {
        const weatherMap = {
            'CLEAR_DAY': '晴天',
            'CLEAR_NIGHT': '晴夜',
            'PARTLY_CLOUDY_DAY': '多云',
            'PARTLY_CLOUDY_NIGHT': '多云',
            'CLOUDY': '阴天',
            'LIGHT_HAZE': '轻雾',
            'MODERATE_HAZE': '中雾',
            'HEAVY_HAZE': '重雾',
            'LIGHT_RAIN': '小雨',
            'MODERATE_RAIN': '中雨',
            'HEAVY_RAIN': '大雨',
            'STORM_RAIN': '暴雨',
            'LIGHT_SNOW': '小雪',
            'MODERATE_SNOW': '中雪',
            'HEAVY_SNOW': '大雪',
            'STORM_SNOW': '暴雪',
            'DUST': '浮尘',
            'SAND': '沙尘',
            'WIND': '大风'
        };
        
        return weatherMap[skycon] || '未知天气';
    }

    /**
     * 格式化天气预警信息
     */
    formatAlerts(alertData) {
        if (!alertData.content || !alertData.content.length) {
            return [];
        }

        return alertData.content.map(alert => ({
            title: alert.title || '天气预警',
            description: alert.description || '',
            level: alert.status || '未知',
            type: alert.code || 'OTHER'
        }));
    }

    /**
     * 获取空气质量信息（复用原方法）
     */
    async getAirQualityInfo() {
        try {
            // 使用免费的空气质量API - aqicn.org
            const response = await axios.get('https://api.waqi.info/feed/chengdu/?token=demo', {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            if (response.status === 200 && response.data && response.data.status === 'ok') {
                const data = response.data.data;
                return {
                    aqi: data.aqi || '未知',
                    pm25: data.iaqi?.pm25?.v || '未知',
                    pm10: data.iaqi?.pm10?.v || '未知',
                    no2: data.iaqi?.no2?.v || '未知',
                    so2: data.iaqi?.so2?.v || '未知',
                    co: data.iaqi?.co?.v || '未知',
                    o3: data.iaqi?.o3?.v || '未知',
                    dominantPol: data.dominentpol || '未知',
                    updateTime: data.time?.s || '未知'
                };
            } else {
                throw new Error('空气质量API响应异常');
            }
        } catch (error) {
            console.log(`[空气] 空气质量API失败: ${error.message}`);
            return this.getAirQualityFallback();
        }
    }

    /**
     * 空气质量备用方案
     */
    async getAirQualityFallback() {
        return {
            error: true,
            message: '空气质量数据暂时不可用'
        };
    }

    /**
     * 获取天气的备用方案
     */
    async getWeatherFallback() {
        try {
            // 备用方案：使用简化的API或者返回基础信息
            console.log('[彩云天气] 尝试备用方案...');
            this.debugLog('启用备用天气方案');
            
            // 可以在这里添加其他天气API作为备用
            return {
                location: this.location,
                error: true,
                message: '暂时无法获取天气信息，请稍后重试'
            };
        } catch (error) {
            console.log(`[彩云天气] 备用方案也失败: ${error.message}`);
            return {
                location: this.location,
                error: true,
                message: '天气服务暂时不可用'
            };
        }
    }

    /**
     * 格式化天气信息为邮件内容
     */
    formatWeatherForEmail(weatherData) {
        if (weatherData.error) {
            return `🌤️ ${weatherData.location}天气\n❌ ${weatherData.message}`;
        }

        const { location, current, today, tomorrow, threeDayForecast, airQuality, forecastKeypoint, alerts } = weatherData;

        // 构建主要天气信息
        const weatherEmail = [
            `🌤️ ${location}天气 (彩云天气)`,
            '- - - - - - - - - - - - - - - -',
            `🌡️ 当前: ${current.temperature}°C ${current.description}`,
        ];

        // 添加天气趋势（紧跟在当前天气下面）
        if (forecastKeypoint && forecastKeypoint.trim()) {
            weatherEmail.push(`🎯 天气趋势: ${forecastKeypoint}`);
        }

        weatherEmail.push(
            `💧 湿度: ${current.humidity}% | 🌬️ ${current.windDirection} ${current.windSpeed}km/h`,
            `🤲 体感: ${current.feelsLike}°C | 👁️ 能见度: ${current.visibility}km`,
            `📊 气压: ${current.pressure}hPa | ☁️ 云量: ${current.cloudRate}%`,
            `🌞 紫外线: ${current.uvIndex} | 😌 舒适度: ${current.comfort}`
        );

        // 添加空气质量信息（合并到青羊区天气）
        if (airQuality && !airQuality.error) {
            const aqiLevel = this.getAQILevel(airQuality.aqi);
            weatherEmail.push(`🌫️ 空气质量: ${aqiLevel.emoji} ${aqiLevel.level} (AQI: ${airQuality.aqi})`);
        } else if (airQuality && airQuality.error) {
            weatherEmail.push(`🌫️ 空气质量: ❌ ${airQuality.message}`);
        }

        // 添加生活建议
        const lifeAdvice = [];
        if (today.coldRisk && today.coldRisk !== '未知') {
            lifeAdvice.push(`🤧 感冒指数: ${today.coldRisk}`);
        }
        if (today.dressing && today.dressing !== '未知') {
            lifeAdvice.push(`👕 穿衣建议: ${today.dressing}`);
        }
        if (today.carWashing && today.carWashing !== '未知') {
            lifeAdvice.push(`🚗 洗车指数: ${today.carWashing}`);
        }

        if (lifeAdvice.length > 0) {
            weatherEmail.push(
                '',
                '💡 生活建议',
                '- - - - - - - - - - - - - - - -',
                ...lifeAdvice
            );
        }

        // 添加12小时天气预报
        const hourlyForecast = this.format12HourForecast(weatherData);
        if (hourlyForecast) {
            weatherEmail.push(
                '',
                '⏰ 12小时预报',
                '- - - - - - - - - - - - - - - -',
                hourlyForecast
            );
        }

        // 添加3天天气预报表格
        if (threeDayForecast && threeDayForecast.length > 0) {
            weatherEmail.push(
                '',
                '📅 3天天气预报',
                '- - - - - - - - - - - - - - - -',
                '日期     温度范围      天气状况',
                '- - - - - - - - - - - - - - - -'
            );
            
            threeDayForecast.forEach(day => {
                // 日期列：固定宽度
                const dayStr = day.day === '今日' ? '今日     ' : 
                              day.day === '明日' ? '明日     ' : 
                              day.day === '后日' ? '后日     ' : day.day.padEnd(9, ' ');
                
                // 温度范围列：确保对齐，考虑数字位数差异
                const minTemp = day.minTemp.toString().padStart(2, ' '); // 右对齐温度
                const maxTemp = day.maxTemp.toString().padStart(2, ' '); // 右对齐温度
                const tempRange = `${minTemp}°C~${maxTemp}°C`;
                const tempStr = tempRange.padEnd(14, ' '); // 增加宽度确保对齐
                
                // 天气状况
                const weatherStr = day.description;
                
                weatherEmail.push(`${dayStr}${tempStr}${weatherStr}`);
            });
        }

        // 添加天气预警信息
        if (alerts && alerts.length > 0) {
            weatherEmail.push(
                '',
                '⚠️ 天气预警',
                '- - - - - - - - - - - - - - - -'
            );
            alerts.forEach(alert => {
                weatherEmail.push(`${this.getAlertEmoji(alert.level)} ${alert.title}`);
                if (alert.description) {
                    weatherEmail.push(`   ${alert.description.substring(0, 50)}...`);
                }
            });
        }

        return weatherEmail.join('\n');
    }

    /**
     * 根据预警级别获取emoji
     */
    getAlertEmoji(level) {
        const emojiMap = {
            '蓝色': '🔵',
            '黄色': '🟡',
            '橙色': '🟠',
            '红色': '🔴',
            'blue': '🔵',
            'yellow': '🟡',
            'orange': '🟠',
            'red': '🔴'
        };
        return emojiMap[level] || '⚠️';
    }

    /**
     * 根据AQI值获取等级和emoji
     */
    getAQILevel(aqi) {
        if (aqi === '未知' || !aqi) {
            return { level: '未知', emoji: '❓' };
        }

        const aqiValue = parseInt(aqi);
        
        if (aqiValue <= 50) {
            return { level: '优', emoji: '🟢' };
        } else if (aqiValue <= 100) {
            return { level: '良', emoji: '🟡' };
        } else if (aqiValue <= 150) {
            return { level: '轻度污染', emoji: '🟠' };
        } else if (aqiValue <= 200) {
            return { level: '中度污染', emoji: '🔴' };
        } else if (aqiValue <= 300) {
            return { level: '重度污染', emoji: '🟣' };
        } else {
            return { level: '严重污染', emoji: '🟤' };
        }
    }

    /**
     * 获取天气预警信息
     */
    getWeatherTips(weatherData) {
        if (weatherData.error) {
            return '';
        }

        const tips = [];
        const currentTemp = parseInt(weatherData.current.temperature);
        const humidity = parseInt(weatherData.current.humidity);
        const uvIndex = parseInt(weatherData.today.uvIndex) || 0;
        const airQuality = weatherData.airQuality;
        const alerts = weatherData.alerts;

        // 天气预警提醒
        if (alerts && alerts.length > 0) {
            alerts.forEach(alert => {
                tips.push(`⚠️ ${alert.title}：${alert.description.substring(0, 30)}...`);
            });
        }

        // 温度提醒
        if (currentTemp <= 5) {
            tips.push('❄️ 气温较低，注意保暖');
        } else if (currentTemp >= 35) {
            tips.push('🔥 气温很高，注意防暑');
        }

        // 湿度提醒
        if (humidity >= 80) {
            tips.push('💧 湿度较高，注意通风');
        }

        // UV提醒
        if (uvIndex >= 7) {
            tips.push('☀️ 紫外线强，注意防晒');
        }

        // 天气描述提醒
        const desc = weatherData.current.description;
        if (desc.includes('雨')) {
            tips.push('🌧️ 有降雨，记得带伞');
        } else if (desc.includes('雪')) {
            tips.push('🌨️ 有降雪，注意保暖和路滑');
        } else if (desc.includes('雾') || desc.includes('霾')) {
            tips.push('🌫️ 能见度较低，注意交通安全');
        }

        // 空气质量提醒
        if (airQuality && !airQuality.error) {
            const aqi = parseInt(airQuality.aqi);
            const pm25 = parseInt(airQuality.pm25);

            if (aqi > 150) {
                tips.push('🚨 空气污染严重，减少户外活动');
            } else if (aqi > 100) {
                tips.push('😷 空气质量一般，敏感人群减少户外运动');
            } else if (aqi > 50) {
                tips.push('🌬️ 空气质量良好，适度户外活动');
            }

            if (pm25 > 75) {
                tips.push('💨 PM2.5浓度较高，建议佩戴N95口罩');
            } else if (pm25 > 35) {
                tips.push('😷 PM2.5偏高，外出建议佩戴口罩');
            }

            if (aqi > 200) {
                tips.push('🏠 建议减少开窗，使用空气净化器');
            } else if (aqi > 150) {
                tips.push('🏃‍♂️ 避免剧烈运动，儿童老人减少外出');
            }
        }

        return tips.length > 0 ? '\n💡 温馨提示:\n' + tips.join('\n') : '';
    }

    /**
     * 格式化12小时天气预报
     */
    format12HourForecast(weatherData) {
        try {
            if (weatherData.error || !weatherData.hourly) {
                return null;
            }

            const hourly = weatherData.hourly;
            const temperatureData = hourly.temperature?.slice(0, 12) || [];
            const skyconData = hourly.skycon?.slice(0, 12) || [];
            const precipitationData = hourly.precipitation?.slice(0, 12) || [];

            if (temperatureData.length === 0) {
                return '暂无小时预报数据';
            }

            const forecastLines = [];
            
            for (let i = 0; i < Math.min(12, temperatureData.length); i++) {
                const temp = temperatureData[i];
                const sky = skyconData[i];
                const precip = precipitationData[i];

                if (!temp || !temp.datetime) continue;

                // 解析时间
                const datetime = new Date(temp.datetime);
                const hour = datetime.getHours().toString().padStart(2, '0');
                const timeStr = `${hour}:00`;

                // 温度
                const temperature = Math.round(temp.value) + '°C';

                // 天气状况
                const weatherDesc = sky ? this.getWeatherDescription(sky.value) : '未知';

                // 降水信息
                let precipInfo = '';
                if (precip && precip.value > 0) {
                    const precipMM = (precip.value).toFixed(1);
                    precipInfo = ` ${precipMM}mm`;
                } else {
                    precipInfo = ' 无雨';
                }

                // 格式化行：时间 温度 天气 降水
                const forecastLine = `${timeStr} ${temperature.padEnd(5)} ${weatherDesc.padEnd(6)} ${precipInfo}`;
                forecastLines.push(forecastLine);
            }

            return forecastLines.join('\n');

        } catch (error) {
            console.log(`[彩云天气] 格式化12小时预报失败: ${error.message}`);
            return '12小时预报暂不可用';
        }
    }
}

export default CaiyunWeatherService;