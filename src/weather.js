/**
 * 天气查询模块
 */

import axios from 'axios';

class WeatherService {
    constructor() {
        this.location = '成都青羊区';
    }

    /**
     * 获取成都青羊区天气信息
     */
    async getWeatherInfo() {
        try {
            console.log('[天气] 正在获取成都青羊区天气信息...');

            // 并行获取天气和空气质量数据
            const [weatherData, airQualityData] = await Promise.allSettled([
                this.getBasicWeatherInfo(),
                this.getAirQualityInfo()
            ]);

            let weatherInfo = null;
            let airQuality = null;

            // 处理天气数据
            if (weatherData.status === 'fulfilled') {
                weatherInfo = weatherData.value;
            } else {
                console.log(`[天气] 天气数据获取失败: ${weatherData.reason}`);
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
            console.log(`[天气] 获取天气信息失败: ${error.message}`);
            return this.getWeatherFallback();
        }
    }

    /**
     * 获取基础天气信息
     */
    async getBasicWeatherInfo() {
        const response = await axios.get('https://wttr.in/成都', {
            params: {
                format: 'j1', // JSON格式
                lang: 'zh'    // 中文
            },
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (response.status === 200 && response.data) {
            return this.formatWeatherData(response.data);
        } else {
            throw new Error('天气API响应异常');
        }
    }

    /**
     * 获取空气质量信息
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
            // 备用方案：使用另一个API或者返回错误信息
            console.log(`[空气] 主要API失败，尝试备用方案: ${error.message}`);
            return this.getAirQualityFallback();
        }
    }

    /**
     * 空气质量备用方案
     */
    async getAirQualityFallback() {
        try {
            // 备用API方案（这里可以添加其他免费的空气质量API）
            return {
                error: true,
                message: '空气质量数据暂时不可用'
            };
        } catch (error) {
            return {
                error: true,
                message: '空气质量数据获取失败'
            };
        }
    }

    /**
     * 格式化天气数据
     */
    formatWeatherData(data) {
        try {
            const current = data.current_condition[0];
            const today = data.weather[0];
            const tomorrow = data.weather[1];

            // 当前天气
            const currentTemp = current.temp_C;
            const currentDesc = current.lang_zh ? current.lang_zh[0].value : current.weatherDesc[0].value;
            const humidity = current.humidity;
            const windSpeed = current.windspeedKmph;
            const feelLike = current.FeelsLikeC;

            // 今日天气
            const todayMax = today.maxtempC;
            const todayMin = today.mintempC;
            const todayDesc = today.lang_zh ? today.lang_zh[0].value : today.desc[0].value;

            // 明日天气
            const tomorrowMax = tomorrow.maxtempC;
            const tomorrowMin = tomorrow.mintempC;
            const tomorrowDesc = tomorrow.lang_zh ? tomorrow.lang_zh[0].value : tomorrow.desc[0].value;

            // 空气质量
            const uvIndex = today.uvIndex || '未知';

            const weatherInfo = {
                location: '成都青羊区',
                current: {
                    temperature: currentTemp,
                    description: currentDesc,
                    humidity: humidity,
                    windSpeed: windSpeed,
                    feelsLike: feelLike
                },
                today: {
                    maxTemp: todayMax,
                    minTemp: todayMin,
                    description: todayDesc,
                    uvIndex: uvIndex
                },
                tomorrow: {
                    maxTemp: tomorrowMax,
                    minTemp: tomorrowMin,
                    description: tomorrowDesc
                }
            };

            console.log('[天气] 天气信息获取成功');
            return weatherInfo;

        } catch (error) {
            console.log(`[天气] 解析天气数据失败: ${error.message}`);
            return this.getWeatherFallback();
        }
    }

    /**
     * 获取天气的备用方案
     */
    async getWeatherFallback() {
        try {
            // 备用API: 使用简化的wttr.in格式
            const response = await axios.get('https://wttr.in/成都?format=%l:+%c+%t+%h+%w', {
                timeout: 10000,
                headers: {
                    'User-Agent': 'curl/7.68.0'
                }
            });

            if (response.status === 200 && response.data) {
                const weatherText = response.data.trim();
                return {
                    location: '成都青羊区',
                    simple: true,
                    text: weatherText
                };
            }
        } catch (error) {
            console.log(`[天气] 备用API也失败: ${error.message}`);
        }

        // 最终备用方案
        return {
            location: '成都青羊区',
            error: true,
            message: '暂时无法获取天气信息，请稍后重试'
        };
    }

    /**
     * 格式化天气信息为邮件内容
     */
    formatWeatherForEmail(weatherData) {
        if (weatherData.error) {
            return `🌤️ ${weatherData.location}天气\n❌ ${weatherData.message}`;
        }

        if (weatherData.simple) {
            return `🌤️ ${weatherData.location}天气\n${weatherData.text}`;
        }

        const { location, current, today, tomorrow, airQuality } = weatherData;

        const weatherEmail = [
            `🌤️ ${location}天气`,
            '- - - - - - - - - - - - - - - -',
            `🌡️ 当前: ${current.temperature}°C ${current.description}`,
            `💧 湿度: ${current.humidity}% | 🌬️ 风速: ${current.windSpeed}km/h`,
            `🤲 体感: ${current.feelsLike}°C`,
            '',
            `📅 今日: ${today.minTemp}°C ~ ${today.maxTemp}°C`,
            `☀️ ${today.description} | UV指数: ${today.uvIndex}`,
            '',
            `📅 明日: ${tomorrow.minTemp}°C ~ ${tomorrow.maxTemp}°C`,
            `☀️ ${tomorrow.description}`,
        ];

        // 添加空气质量信息
        if (airQuality && !airQuality.error) {
            const aqiLevel = this.getAQILevel(airQuality.aqi);
            weatherEmail.push(
                '',
                '🌫️ 空气质量',
                '- - - - - - - - - - - - - - - -',
                `${aqiLevel.emoji} AQI: ${airQuality.aqi} (${aqiLevel.level})`,
                `💨 PM2.5: ${airQuality.pm25}μg/m³ | PM10: ${airQuality.pm10}μg/m³`,
                `🏭 NO₂: ${airQuality.no2} | SO₂: ${airQuality.so2}`,
                `⚗️ CO: ${airQuality.co} | O₃: ${airQuality.o3}`
            );
        } else if (airQuality && airQuality.error) {
            weatherEmail.push(
                '',
                '🌫️ 空气质量',
                '- - - - - - - - - - - - - - - -',
                `❌ ${airQuality.message}`
            );
        }

        return weatherEmail.join('\n');
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
        if (weatherData.error || weatherData.simple) {
            return '';
        }

        const tips = [];
        const currentTemp = parseInt(weatherData.current.temperature);
        const humidity = parseInt(weatherData.current.humidity);
        const uvIndex = parseInt(weatherData.today.uvIndex) || 0;
        const airQuality = weatherData.airQuality;

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
        const desc = weatherData.current.description.toLowerCase();
        if (desc.includes('雨') || desc.includes('rain')) {
            tips.push('🌧️ 有降雨，记得带伞');
        }

        // 空气质量提醒
        if (airQuality && !airQuality.error) {
            const aqi = parseInt(airQuality.aqi);
            const pm25 = parseInt(airQuality.pm25);

            // AQI提醒
            if (aqi > 150) {
                tips.push('🚨 空气污染严重，减少户外活动');
            } else if (aqi > 100) {
                tips.push('😷 空气质量一般，敏感人群减少户外运动');
            } else if (aqi > 50) {
                tips.push('🌬️ 空气质量良好，适度户外活动');
            }

            // PM2.5特别提醒
            if (pm25 > 75) {
                tips.push('💨 PM2.5浓度较高，建议佩戴N95口罩');
            } else if (pm25 > 35) {
                tips.push('😷 PM2.5偏高，外出建议佩戴口罩');
            }

            // 综合健康建议
            if (aqi > 200) {
                tips.push('🏠 建议减少开窗，使用空气净化器');
            } else if (aqi > 150) {
                tips.push('🏃‍♂️ 避免剧烈运动，儿童老人减少外出');
            }
        }

        return tips.length > 0 ? '\n💡 温馨提示:\n' + tips.join('\n') : '';
    }
}

export default WeatherService;