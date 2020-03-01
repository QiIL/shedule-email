const email = require("emailjs") 
const schedule = require("node-schedule") 
const fs = require("fs") 
const lsconverter = require("./LunarSolarConverter.io") 
const template = require("./template") 

const CfgDev = JSON.parse(fs.readFileSync('config.json')) 

const server = email.server.connect({
    user: CfgDev.developer,
    password: CfgDev.smtpPassword,
    host: CfgDev.smtpHost,
    ssl: true
}) 

function calcTwodayDis(T1, T2) {
    Timestamp1 = new Date(T1).getTime()
    Timestamp2 = new Date(T2).getTime()
    if (Timestamp2 < Timestamp1) {
        return -1 
    } else if (Timestamp2 === Timestamp1) {
        return 0 
    } 
    else {
        return parseInt((Timestamp2 / 1000 - Timestamp1 / 1000)  / 86400) 
    } 
} 

schedule.scheduleJob({second: 0, minute: 0, hour: 9}, () => {
    let All = JSON.parse(fs.readFileSync('remind.json'))
    // 循环给每一个人都发邮件`
    for(let People of All) {
        Msg = getAllRemindEvent(People.remind) 
        doSendEmail(People.fromUser, People.mail, Msg)
    } 
}) 

// 组织一下信件
function getAllRemindEvent(List) {
    let Msg = '' 
    for (let Event of List) {
        if (Event.type === 'birthday') {
            Msg = Msg + genBirthdayMsg(Event) 
        } else if (Event.type === 'mission') {
            Msg = Msg + genMissionMsg(Event) 
        }
    }
    return Msg 
} 

function genBirthdayMsg(People) {
    let nowYear = new Date().getFullYear() 
    let nowMonth = new Date().getMonth() + 1 
    let nowDate = new Date().getDate()
    let solarBirthday = '' 
    if (People.use === 1) {
        const lunar = new lsconverter.Lunar() 
        const converter = new lsconverter.LunarSolarConverter()
        lunar.isleap = false 
        lunar.lunarYear = nowYear 
        lunar.lunarMonth = parseInt(People.lunar.month) 
        lunar.lunarDay = parseInt(People.lunar.day) 
        let solarObj = converter.LunarToSolar(lunar) 
        solarBirthday = nowYear.toString() + '-' + solarObj.solarMonth + '-' + solarObj.solarDay + ' 00:00:00' 
    } else {
        solarBirthday = nowYear.toString() + '-' + People.solar.month + '-' + People.solar.day + ' 00:00:00' 
    }
    // 判断今天距离生日是否是30 | 7 | 3天
    let today = nowYear.toString() + '-' + nowMonth.toString() + '-' + nowDate.toString() + ' 00:00:00'
    distentDay = calcTwodayDis(today, solarBirthday)
    if (distentDay === 30 || distentDay === 9 || distentDay === 3) {
        console.log(`birsday people: ${People.name}, distence: ${distentDay}`)
        return template.loop1 + "距离" + People.name + "的生日还有: " + template.loop2 + " " + distentDay + " 天" + template.loop2 + template.loop3 + template.loop4 
    } else if (distentDay === 0) {
        return template.loop1 + "今天是" + People.name + "的生日噢，快祝她/他生日快乐吧！" + template.loop3 + template.loop4 
    } else {
        return '' 
    }
} 

function genMissionMsg(Mission) {
    let nowYear = new Date().getFullYear() 
    let nowMonth = new Date().getMonth() + 1 
    let nowDate = new Date().getDate()
    let today = nowYear.toString() + '-' + nowMonth.toString() + '-' + nowDate.toString() + ' 00:00:00'
    let TargetDate = ''
    if (Mission.year !== 0) {
        TargetDate = Mission.year.toString() + '-' + Mission.month.toString() + '-' + Mission.day.toString() + ' 00:00:00'
    } else if (Mission.month !== 0) {
        TargetDate = nowYear.toString() + '-' + Mission.month.toString() + '-' + Mission.day.toString() + ' 00:00:00'
    } else {
        TargetDate = today
    }
    if (calcTwodayDis(today, TargetDate) === 0) {
        return  template.loop1 + "今天的提醒：" + Mission.msg + template.loop3 + template.loop4 
    } else {
        return ''
    }
}

// 发邮件
function doSendEmail(FromUser, TargetMail, Msg) {
    let nowYear = new Date().getFullYear() 
    let nowMonth = new Date().getMonth() + 1 
    let nowDate = new Date().getDate()
    console.log(`do the job ${new Date().toLocaleString()}`) 
    if (Msg !== '') {
        server.send({
            from: CfgDev.developer,
            to: TargetMail,
            subject: `来自：${FromUser}的提醒~。~`,
            attachment: [
                {
                    data: template.head1 + `${nowYear}-${nowMonth}-${nowDate}` + template.head2 + Msg + template.tail,
                    alternative: true
                }
            ]
        }, function(err, msg) { 
            if (err) {
                server.send({
                    text: `${err} /n/n/n/n ${msg}`,
                    from: Developer,
                    to: Developer,
                    subject: 'shedule-email error'
                })
            }
        }) 
    } 
} 