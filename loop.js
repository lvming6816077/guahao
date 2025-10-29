const CryptoJS = require('crypto-js');
const axios = require('axios');

// 基本加密所需的常量
const cryptoValue = "vss7db748e839799";  // 解密函数必需，移回顶部

// 加密函数
function encrypt(data) {
    data = JSON.stringify(data);
    var cipher = CryptoJS.AES.encrypt(data, CryptoJS.enc.Utf8.parse(cryptoValue), {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7,
        iv: ""
    });
    return cipher.ciphertext.toString(CryptoJS.enc.Base64)
}

// 解密函数
function decrypt(base64Cipher) {
    var decipher = CryptoJS.AES.decrypt(base64Cipher, CryptoJS.enc.Utf8.parse(cryptoValue), {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7,
        iv: ""
    });
    return CryptoJS.enc.Utf8.stringify(decipher)
}

// 格式化日期函数
function formatDateTime(timestamp) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// 常量配置
// const cryptoValue = "vss7db748e839799";  // 已移至顶部


// 导出decrypt方法供外部使用
module.exports = {
    decrypt
};

// 获取MD5
function getMd5(data) {
    var md5 = CryptoJS.MD5(data);
    return md5.toString(CryptoJS.enc.Base64)
}

// 获取UUID
function getUuid() {
    var uuid;
    var _randomKey = 1;
    var str = "xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx".replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0
          , v = c == "x" ? r : r & 3 | 8;
        return v.toString(16) + ++_randomKey
    });
    uuid = str.substring(str.length - 45)
    return uuid
}

// 获取安全头
function getSecureHeader(jsonData) {
    return {
        "X-Ca-Key": CAKEY,
        "X-Ca-Nonce": getUuid(),
        "X-Ca-Timestamp": +new Date,
        "X-Content-MD5": getMd5(jsonData),
        "X-Service-Encrypt": '1'
    }
}

// 获取签名头
function getSignHeader(headers) {
    var textToSign = "";
    var headerArr = ["X-Ca-Key", "X-Ca-Nonce", "X-Ca-Timestamp", "X-Content-MD5", "X-Service-Id", "X-Service-Method"];
    for (var i = 0; i < headerArr.length; i++) {
        var it = headerArr[i];
        var name = it.toLowerCase();
        var value = headers[it];
        if (value) {
            textToSign += name + ":" + value + "&"
        }
    }
    textToSign = textToSign.substring(0, textToSign.length - 1);
    var hash = CryptoJS.HmacSHA256(textToSign, CASECRET);
    var signature = hash.toString(CryptoJS.enc.Base64);
    return signature
}

// 发送请求的通用函数
async function sendRequest(data, serviceId, serviceMethod, clientSource, token = null) {
    try {
        let jsonData = encrypt(data);
        var secureHeader = getSecureHeader(JSON.stringify(jsonData));
        let headers = {
            'Content-Type': 'application/json',
            'X-Client-Id': CLIENT,
            'X-Service-Id': serviceId,
            'X-Service-Method': serviceMethod,
            'X-Client-Source': clientSource,
            ...secureHeader
        };

        if (token) {
            headers['X-Access-Token'] = token;
        }

        headers['X-Ca-Signature'] = getSignHeader(headers);

        const response = await axios.post('https://weixin.ngarihealth.com/weixin/wx/mp/wxf011d4f784d01944/gateway', jsonData, {
            headers: headers
        });

        return JSON.parse(decrypt(response.data));
    } catch (error) {
        console.error('请求失败:', error.message);
        throw error;
    }
}

// 全局变量
let isRunning = false;
let currentTimer = null;
let shouldContinue = true;

// 步骤1: 查询医生排班信息
async function queryDoctorSchedule(doctorId) {
    if (!shouldContinue) return false;
    
    console.log(`正在查询医生 ${doctorId} 的排班信息...`);
    try {
        // 构造请求数据
        const requestData = [{"doctorId": doctorId, "needEmployee": false, "organId": ORGAN_ID, "depart": ""}];
        
        // 发送请求
        const res = await sendRequest(
            requestData,
            'appoint.unLoginService',
            'queryDoctorSchedulingForDoctorIndexNew',
            'eh.wx.health.doctor.SingleDoctIndex'
        );
        
        if (res.code == 200 && res.body && res.body[0]) {
            let schedules = res.body[0].schedules || [];
            // 查找有票的排班

            console.log(`${formatDateTime(Date.now())} 刷票中:`);

            for (let i = 0; i < schedules.length; i++) {
                let item = schedules[i];
                /**
                 * item示例：
                 * {
                    scheduleId: 198779051,
                    doctorId: 108006,
                    doctorName: '潘金丽',
                    organId: 1004211,
                    organSchedulingId: '217476',
                    scheduleTimeId: '4',
                    workDate: '2025-10-31 00:00:00',
                    workTimeType: '4',
                    workTimeTypeName: '上午',
                    sourceNum: 30,
                    usedNum: 18,
                    unUsedNum: 12,
                    usableNum: 12,
                    price: 12,
                    medicalCarePrice: 12,
                    totalPrice: 12,
                    hospCode: '01',
                    hospName: '河南省中西医结合医院',
                    status: 0,
                    createDate: '2025-10-24 01:11:33',
                    updateDate: '2025-10-29 22:15:57',
                    hisScheduleFrom: 1,
                    jobNumber: '0108',
                    appointDepartCode: '0098',
                    scheduleType: 2,
                    appointDepartName: '内科门诊',
                    scheduleFrom: 1,
                    ngariBusType: 1,
                    sourceLevel: 2,
                    startTime: '2025-10-31 08:00:00',
                    endTime: '2025-10-31 12:00:00',
                    stopFlag: 0,
                    hisSourceLevelText: '专家',
                    week: '星期五',
                    scheduleTimeIdNum: 1,
                    appointAble: true,
                    appointAbleMsg: '',
                    precisonAppointFlag: false,
                    stopScheduleCheck: false,
                    sourceLevelText: '专家门诊',
                    organIdText: '河南省中西医结合医院',
                    sourceTypeText: '',
                    stopFlagText: '正常',
                    cloudClinicTypeText: ''
                    }
                    */
  
                // 修复bug：usableNum > 0 才表示有票
                // 添加日期限制逻辑：检查startTime是否在允许的日期范围内
                if (item.usableNum > 0 && isWithinAllowedDateRange(item.startTime)) {
                    console.log(`发现可预约时段: ${item.workDate} ${item.workTimeType}`);
                    console.log(item)
                    let scheduleInfo = [
                          {
                            "organId": item.organId,
                            "organSchedulingId": item.organSchedulingId,
                            "scheduleType": item.scheduleType,
                            "workDate": item.workDate,
                            "workTimeType": item.workTimeType,
                            "doctorId": item.doctorId,
                            "scheduleTimeId": item.scheduleTimeId,
                            "jobNumber": item.jobNumber,
                            "appointDepartCode": item.appointDepartCode
                          }
                        ];
                    // 进入下一步
                    await getOrderNumber(scheduleInfo);
                    return true;
                }
                // 记录但不处理不在允许日期范围内的有票时段
                else if (item.usableNum > 0) {
                    // console.log(`发现有票但不在允许日期范围: ${item.workDate} ${item.workTimeType}`);
                }
            }
        }
        return false;
    } catch (error) {
        console.error('查询排班失败:', error.message);
        return false;
    }
}

// 停止定时查询
function stopScheduling() {
    if (currentTimer) {
        clearTimeout(currentTimer);
        currentTimer = null;
    }
    isRunning = false;
    shouldContinue = false;
    console.log('========================================');
    console.log('已停止预约查询');
    console.log('========================================');
}

// 步骤2: 获取订单号
async function getOrderNumber(scheduleInfo) {
    if (!shouldContinue) return;
    
    console.log('正在获取订单号...');
    try {
        const res = await sendRequest(
            scheduleInfo,
            'appoint.scheduleService',
            'getOrderNumByScheduling',
            'eh.wx.health.select.SelectAppointAddr',
            TOKEN
        );
        
        if (res.code == 200 && res.body) {
            let orderNums = res.body.orderNums || [];
            let scheduleDetails = res.body.scheduleInfo || {};
            
            if (orderNums.length && orderNums[0]) {
                let order = orderNums[0];
                console.log(`获取到订单号: ${order.orderNum}, 时间段: ${order.orderNumSopt}`);
                
                // 构造预约数据
                let appointmentData = [{
                    "mpiid": "2c90822595d72404019616276ac16fd4",
                    "patientName": "吕鸣",
                    "organAppointId": "",
                    "scheduleId": scheduleDetails.scheduleId,
                    "scheduleTimeId": scheduleDetails.scheduleTimeId,
                    "orderNumSopt": order.orderNumSopt,
                    "organId": scheduleDetails.organId,
                    "appointDepartId": "0098",
                    "appointDepartName": "内科门诊",
                    "doctorId": scheduleDetails.doctorId,
                    "workDate": scheduleDetails.workDate,
                    "workType": scheduleDetails.workType,
                    "startTime": order.startTime,
                    "endTime": order.endTime,
                    "orderNum": order.orderNum,
                    "appointRoad": 5,
                    "appointStatus": 0,
                    "appointPath": 9,
                    "appointUser": "2c90826d95d729bb0196154c0b136c65",
                    "appointName": "李文",
                    "appointOragn": "",
                    "clinicPrice": 12,
                    "transferId": 0,
                    "sourceLevel": 2,
                    "clinicId": "473733",
                    "ifCreateFollowPlan": 1,
                    "cardId": "410104199012270074",
                    "triggerId": null,
                    "medInsureCarId": "",
                    "appointRecordExt": {
                        "illSummaryTxt": "",
                        "thirdChannel": null
                    },
                    "analyzeNvcData": "",
                    "ruleString": "",
                    "isRealTime": 0,
                    "cardType": "1"
                }];
                
                // 进入最后一步：提交预约
                await submitAppointment(appointmentData, order.orderNum);
            }
        }
    } catch (error) {
        console.error('获取订单号失败:', error.message);
    }
}

// 步骤3: 提交预约
async function submitAppointment(appointmentData, orderNum) {
    console.log(`正在提交预约，订单号: ${orderNum}...`);
    try {
        appointmentData[0].orderNum = orderNum;
        
        const res = await sendRequest(
            appointmentData,
            'appoint.requestAppointRecordService',
            'addAppointRecord',
            'eh.wx.health.doctor.AppointApply',
            TOKEN
        );
        
        console.log(`预定结果：${orderNum}_Response:`, res);
        
        // 无论成功失败都停止定时器
        stopScheduling();
        
        if (res.code == 200) {
            console.log('✅ 预约成功！');
            return true;
        } else {
            console.log(`❌ 预约失败: ${res.msg || '未知错误'}`);
            return false;
        }
    } catch (error) {
        // 发生异常也停止定时器
        stopScheduling();
        // console.error('提交预约失败:', error.message);
        return false;
    }
}

// 定时查询函数
function scheduleSearch(doctorId) {
    if (isRunning || !shouldContinue) return;
    
    isRunning = true;
    
    // 生成1-5秒的随机间隔（单位：毫秒）
    const randomInterval = Math.floor(Math.random() * 4000) + 1000;
    
    // console.log(`将在 ${randomInterval}ms 后进行下一次查询...`);
    
    currentTimer = setTimeout(async () => {
        await queryDoctorSchedule(doctorId);
        isRunning = false;
        // 只有shouldContinue为true时才继续查询
        if (shouldContinue) {
            scheduleSearch(doctorId);
        }
    }, randomInterval);
}

// 主函数 - 程序入口
function startAppointmentBot(doctorId = DOCTOR_IDS['吴文先']) {
    // 重置状态
    shouldContinue = true;
    isRunning = false;
    currentTimer = null;
    
    console.log(`========================================`);
    console.log(`挂号机器人启动中...`);
    console.log(`目标医生ID: ${doctorId}`);
    console.log(`========================================`);
    scheduleSearch(doctorId);
}




// 检查日期是否在允许范围内的函数
function isWithinAllowedDateRange(dateString) {
    const targetDate = new Date(dateString.split(' ')[0]); // 提取日期部分
    
    if (DATE_LIMIT_CONFIG.mode === 'specific_dates') {
        const targetDateStr = targetDate.toISOString().split('T')[0]; // 转为YYYY-MM-DD格式
        return DATE_LIMIT_CONFIG.specificDates.includes(targetDateStr);
    } 
    else if (DATE_LIMIT_CONFIG.mode === 'date_range') {
        const startDate = new Date(DATE_LIMIT_CONFIG.startDate);
        const endDate = new Date(DATE_LIMIT_CONFIG.endDate);
        return targetDate >= startDate && targetDate <= endDate;
    }
    
    return true; // 默认允许所有日期
}

// 日期限制配置 - 可根据需要修改
const DATE_LIMIT_CONFIG = {
    // 模式：'specific_dates'(特定日期) 或 'date_range'(日期范围) 或 'not'(不限制)
    mode: 'specific_dates',
    
    // 当mode为'specific_dates'时使用，格式：['YYYY-MM-DD', 'YYYY-MM-DD']
    specificDates: [
        '2025-11-01',
    ],
    
    // 当mode为'date_range'时使用，格式：'YYYY-MM-DD'
    startDate: '2025-10-31',
    endDate: '2025-11-10'
};
// 医生ID常量
const DOCTOR_IDS = {
    '吴文先': 107749,
    '马龙': 107998,
    '春丽': 108006
};
const CAKEY = "ngari-wx";
const CASECRET = "a9d4eb7841b1ba47";
const TOKEN = '6e17629b-e07b-4e1b-97e7-b11ff6b31f15';
const CLIENT = '202064224';
const ORGAN_ID = 1004211;

// 只在直接运行loop.js时启动机器人，被导入时不启动
if (require.main === module) {
    // 启动机器人 (可以传入不同的医生ID)
    // 例如: startAppointmentBot(DOCTOR_IDS['马龙']);
    startAppointmentBot(DOCTOR_IDS['春丽']);
}
