// 引入加密库 CryptoJS，用于数据加密和解密
const CryptoJS = require('crypto-js');
// 引入 axios 库，用于发送 HTTP 请求
const axios = require('axios');
// 引入 moment 库，用于处理日期和时间
const moment = require('moment');

// 加密密钥
const cryptoValue = "vss7db748e839799";
// 访问密钥
const CAKEY = "ngari-wx";
// 密钥秘钥
const CASECRET = "a9d4eb7841b1ba47";

/**
 * 加密函数
 * @param {any} data - 需要加密的数据
 * @returns {string} - 加密后的 Base64 字符串
 */
function encrypt(data) {
    // 将数据转换为 JSON 字符串
    data = JSON.stringify(data);
    // 使用 AES 算法进行加密
    var cipher = CryptoJS.AES.encrypt(data, CryptoJS.enc.Utf8.parse(cryptoValue), {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7,
        iv: ""
    });
    // 将加密后的密文转换为 Base64 字符串
    return cipher.ciphertext.toString(CryptoJS.enc.Base64)
}

/**
 * 解密函数
 * @param {string} base64Cipher - 加密后的 Base64 字符串
 * @returns {string} - 解密后的字符串
 */
function decrypt(base64Cipher) {
    // 使用 AES 算法进行解密
    var decipher = CryptoJS.AES.decrypt(base64Cipher, CryptoJS.enc.Utf8.parse(cryptoValue), {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7,
        iv: ""
    });
    // 将解密后的字节数组转换为 UTF-8 字符串
    return CryptoJS.enc.Utf8.stringify(decipher)
}

/**
 * 计算 MD5 哈希值
 * @param {string} data - 需要计算哈希值的数据
 * @returns {string} - 计算后的 Base64 编码的 MD5 哈希值
 */
var getMd5 = function(data) {
    // 计算 MD5 哈希值
    var md5 = CryptoJS.MD5(data);
    // 将哈希值转换为 Base64 字符串
    return md5.toString(CryptoJS.enc.Base64)
};

/**
 * 生成 UUID
 * @returns {string} - 生成的 UUID
 */
var getUuid = function() {
    var uuid;
    var _randomKey = 1;
    // 生成 UUID 字符串
    var str = "xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx".replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0
          , v = c == "x" ? r : r & 3 | 8;
        return v.toString(16) + ++_randomKey
    });
    // 截取 UUID 字符串的最后 45 个字符
    uuid = str.substring(str.length - 45)
    return uuid
};

/**
 * 获取安全请求头
 * @param {string} jsonData - JSON 格式的数据
 * @returns {Object} - 包含安全请求头的对象
 */
var getSecureHeader = function(jsonData) {
    return {
        // 访问密钥
        "X-Ca-Key": CAKEY,
        // 随机数
        "X-Ca-Nonce": getUuid(),
        // 时间戳
        "X-Ca-Timestamp": +new Date,
        // 请求内容的 MD5 哈希值
        "X-Content-MD5": getMd5(jsonData),
        // 服务加密标志
        "X-Service-Encrypt":'1'
    }
};

/**
 * 获取签名请求头
 * @param {Object} headers - 包含请求头的对象
 * @returns {string} - 签名后的请求头
 */
var getSignHeader = function(headers) {
    var textToSign = "";
    var headerArr = ["X-Ca-Key", "X-Ca-Nonce", "X-Ca-Timestamp", "X-Content-MD5", "X-Service-Id", "X-Service-Method"];
    // 拼接需要签名的字符串
    for (var i = 0; i < headerArr.length; i++) {
        var it = headerArr[i];
        var name = it.toLowerCase();
        var value = headers[it];
        textToSign += name + ":" + value + "&"
    }
    // 去除最后一个 & 符号
    textToSign = textToSign.substring(0, textToSign.length - 1);
    // 使用 HmacSHA256 算法进行签名
    var hash = CryptoJS.HmacSHA256(textToSign, CASECRET);
    // 将签名后的哈希值转换为 Base64 字符串
    var signature = hash.toString(CryptoJS.enc.Base64);

    return signature
};

/**
 * 发送邮件函数
 */
const sendemail = ()=>{
    // 发送 POST 请求
    axios.post('https://report.nihaoshijie.com.cn/rapi/warning/helpMeSendMail',{
        // 收件人邮箱
        email:'441403517@qq.com',
        // 邮件主题
        subject:'qiang',
        // 邮件内容
        text:'q'
    }).then((res)=>{
        // 打印响应结果
        console.log(res.data)
    })
}

// 定时器变量
let timer

/**
 * 获取数据函数
 * @param {Array} op - 请求数据数组
 * @param {string} token - 访问令牌
 * @param {string} client - 客户端 ID
 * @param {string} mpiid - MPI ID
 * @param {string} appointUser - 预约用户 ID
 */
const fetchData = (op,token,client,mpiid,appointUser,callback)=>{
    // 加密请求数据
    let jsonData = encrypt(op)
    // 获取安全请求头
    var secureHeader = getSecureHeader(JSON.stringify(jsonData));
    // 定义请求头
    let headers = {
        // 设置请求内容类型为 JSON
        'Content-Type': 'application/json', 
        // 访问令牌
        'X-Access-Token': token,
        // 客户端 ID
        'X-Client-Id': client,
        // 服务 ID
        'X-Service-Id': 'appoint.requestAppointRecordService',
        // 服务方法
        'X-Service-Method': 'addAppointRecord',
        // 客户端来源
        'X-Client-Source': 'eh.wx.health.doctor.AppointApply',
        // 展开安全请求头
        ...secureHeader
    }
    // 添加签名请求头
    headers['X-Ca-Signature'] = getSignHeader(headers)

    // 发送 POST 请求
    axios.post('https://weixin.ngarihealth.com/weixin/wx/mp/wxf011d4f784d01944/gateway', jsonData, {
        headers: headers
    })
    .then(response => {
        // 解密响应数据
        let res = JSON.parse(decrypt(response.data))
        // 打印响应结果
        console.log(op[0].orderNum + '_Response:', res);

        // 如果响应状态码为 200
        if (res.code == 200) {
            // 清除定时器
            clearInterval(timer)
            // 发送邮件
            sendemail()
        } else {
            callback && callback()
        }
    })
    .catch(error => {
        // 清除定时器
        clearInterval(timer)
        // 打印错误信息
        console.error('Error:', error.message);
    });
}
// tk=e7899f93-9dc4-49e5-bfe1-4fb04c540b2e
// 客户端 ID
let client = '202064224'
// 客户端 ID 2
let client2 = '35949567'

// 访问令牌
let token = 'a7fafd64-7959-4e99-b0fa-4dace43cda3d'
// 访问令牌 2
let token2 = 'cd8122ac-e336-474d-8b63-c808201e247c'
// 请求数据 1
let op1 = [
    {
        "mpiid": "2c90822595d72404019616276ac16fd4",
        "patientName": "吕鸣",
        "organAppointId": "",
        "scheduleId": 199824353,
        "scheduleTimeId": "4",
        "orderNumSopt": "08:00",
        "organId": 1004211,
        "appointDepartId": "0098",
        "appointDepartName": "内科门诊",
        "doctorId": 107998,
        "workDate": "2025-11-04 00:00:00",
        "workType": 4,
        "startTime": "2025-11-04 08:00:00",
        "endTime": "2025-11-04 12:00:00",
        "orderNum": 2,
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
            "thirdChannel": null,
            "deptId": 36016
        },
        "analyzeNvcData": "",
        "ruleString": "",
        "isRealTime": 0,
        "cardType": "1"
    }
]
// 请求数据 2
let op2 = [{
    "mpiid": "2c9082ab7a34a15c017a35f4929a019c",
    "patientName": "张迪文",
    "organAppointId": "",
    "scheduleId": 199824353,
    "scheduleTimeId": "4",
    "orderNumSopt": "08:00",
    "organId": 1004211,
    "appointDepartId": "0098",
    "appointDepartName": "内科门诊",
    "doctorId": 107998,
    "workDate": "2025-11-04 00:00:00",
    "workType": 4,
    "startTime": "2025-11-04 08:00:00",
    "endTime": "2025-11-04 12:00:00",
    "orderNum": 1,
    "appointRoad": 5,
    "appointStatus": 0,
    "appointPath": 9,
    "appointUser": "2c9082ab7a34a15c017a35f4929a019c",
    "appointName": "张迪文",
    "appointOragn": "",
    "clinicPrice": 12,
    "transferId": 0,
    "sourceLevel": 2,
    "clinicId": "67695",
    "ifCreateFollowPlan": 1,
    "cardId": "410104199005140044",
    "triggerId": null,
    "medInsureCarId": "",
    "appointRecordExt": {
        "illSummaryTxt": "",
        "thirdChannel": null,
        "deptId": 36016
    },
    "analyzeNvcData": "",
    "ruleString": "",
    "isRealTime": 0,
    "cardType": "1"
}]

/**
 * 发送数据 1
 */
const sendData1 = ()=>{
    // 调用 fetchData 函数发送数据 1
    fetchData(op1,token,client,()=>{
        fetchData(op1,token,client)
    })
}

/**
 * 发送数据 2
 */
const sendData2 = ()=>{
    // 调用 fetchData 函数发送数据 2
    fetchData(op2,token2,client2,()=>{
        fetchData(op2,token2,client2)
    })
}
const sendData3 = ()=>{
    // 调用 fetchData 函数发送数据 2
    let a = JSON.parse(JSON.stringify(op2))
    a[0].orderNum = 3

    fetchData(a,token2,client2,()=>{
        fetchData(a,token2,client2)
    })
}

// console.log(decrypt("zeEQCSEwB3OQOlycKw71UVXAwUQ4uOjiWK/OzwLoAaBT5qhJkwh5Y0w+1NQAXqnu8mV0LRKv7evevuuV4xN/KbRTVvn4GpqzXy6DjCI0Lr9fE9XNDDZWPm9W7wDZnzU3qH2ea7H78sK4QWa3SZc0pc3ZuVLb2vhv/wPMOyY+hmfCSsgM46l+c3DSFovZVBw9h6Z1cDiOANT+t7uwjvcOq0+P2rHuQej82jyi0fufEuiq/XCyW7iddCbaT/3TAupa2KRjPb5bFM3/NmodJgR5YFJL24q3sqOoRG65aUsgAhQVqV03P0FrzwrO9jQosB/ppf/r1RPPijjb+GGMuGrT8vMstJ24rtojsaGDhXQgeSdJaNG14R1fcX+Rh/BuSTO52k19JiZvjkypfHIc208xek9syJ0gVfp3eosdILV28N5L9g8Cxg2LXsYNbWmupKp0e9r+op9azJUST7KnHjjaOFEAAGzYZoE8EzEudhOAXYgEz6QS//EVMGWMSJvN+YGTnmmqHrHyL7yA+NiUe6oa5ykOIfBhdp2Kn1HbQnQ95/2rV/lPcfbzZSEs7fFKJeYV8hUZIXvNVy4qL8ssmiekYnR0WHN72pHH6k+Aw1jCdFioJPwSXXJ5iR+rEd81wSkxu4EpZFwtWwswpsIrVS/n5ZaP26xhBK4PxueNDtJlAfy7nRVPJ48PUbjsCmPS+CXAjgzlBVXQU8jYAM7gFbAYMavje22uBrXoX+9Sy8cIndHDcAXHyEGj3sfDAUjenQOU7zfv202Zw1mvHY2Cgtl6sGEG+SKAvuwUWdVeiDAIuqlvRR52v/JDtp6XZ1N2m1vfR4N2FDUDa2fadgdZPYKo0PbvkItfVMWUAqXYg5FJ9Jk/+QfaCEfwkH5D7O0i/Xdd7/tfKmbC27qkq2+cFQQ1PMBm1BVJNJ+gWWz3bSVrGSxhrsgQj4Az+7/g8S1Z7vfgoEbEWj5ifJgHasJMLbfeHYuqV7B+YGLjhALV/F+Pg4W35a8Y8B3ZoeB9hsSdtWSfrjk+xh6plgL10Mbj5nt4BxHjz5q0Z3ORF6W1+rOBylBtKr3HMYXFAU1JlQzQxDT1MfHCYquV/cclsVxXX3NTRw=="))
// // 发送数据 1
// sendData1()
// // // 发送数据 2

// sendData2()
// setTimeout(()=>{
//     sendData3()
// },1000)

const submit = ()=>{
    sendData1()
    sendData2()
    setTimeout(()=>{
        sendData3()
    },1000)
}

// // 设置定时器，每 12 毫秒执行一次
timer = setInterval(()=>{
// sendData1()
    // 打印请求中信息
    console.log('请求中')
    // 如果当前时间等于指定时间
    if (moment().format('YYYY-MM-DD HH:mm') === '2025-10-28 07:30') {
        submit()

        // 清除定时器
        clearInterval(timer)
    }
},12)

