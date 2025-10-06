// 邮箱验证API端点
// 这个文件需要部署到您的服务器上

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Supabase配置
const supabaseUrl = 'https://dyfnewofdezuyqvtlmuy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5Zm5ld29mZGV6dXlxdnRsbXV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzQ4MDAsImV4cCI6MjA1MDU1MDgwMH0.YourAnonKey';
const supabase = createClient(supabaseUrl, supabaseKey);

// 邮箱验证端点
app.post('/api/verify-email', async (req, res) => {
  try {
    const { token, email } = req.body;
    
    if (!token || !email) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数'
      });
    }
    
    // 查找用户
    const { data: userProfile, error: findError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', email)
      .eq('verification_token', token)
      .maybeSingle();
    
    if (findError) {
      console.error('查找用户失败:', findError);
      return res.status(500).json({
        success: false,
        message: '服务器错误'
      });
    }
    
    if (!userProfile) {
      return res.status(400).json({
        success: false,
        message: '验证链接无效或已过期'
      });
    }
    
    // 检查是否已经验证
    if (userProfile.is_verified) {
      return res.json({
        success: true,
        message: '邮箱已验证',
        already_verified: true
      });
    }
    
    // 更新验证状态
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        is_verified: true,
        verification_token: null,
        verification_code: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userProfile.id);
    
    if (updateError) {
      console.error('更新验证状态失败:', updateError);
      return res.status(500).json({
        success: false,
        message: '验证失败，请重试'
      });
    }
    
    res.json({
      success: true,
      message: '邮箱验证成功！',
      user_id: userProfile.id
    });
    
  } catch (error) {
    console.error('验证过程中发生错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 重新发送验证邮件端点
app.post('/api/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: '缺少邮箱地址'
      });
    }
    
    // 查找用户
    const { data: userProfile, error: findError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    
    if (findError) {
      console.error('查找用户失败:', findError);
      return res.status(500).json({
        success: false,
        message: '服务器错误'
      });
    }
    
    if (!userProfile) {
      return res.status(400).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    if (userProfile.is_verified) {
      return res.json({
        success: true,
        message: '邮箱已验证，无需重新发送'
      });
    }
    
    // 生成新的验证码和令牌
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationToken = require('crypto')
      .createHash('sha256')
      .update(`${email}:${Date.now()}:${verificationCode}`)
      .digest('hex');
    
    // 更新验证信息
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        verification_code: verificationCode,
        verification_token: verificationToken,
        updated_at: new Date().toISOString()
      })
      .eq('id', userProfile.id);
    
    if (updateError) {
      console.error('更新验证信息失败:', updateError);
      return res.status(500).json({
        success: false,
        message: '重新发送失败'
      });
    }
    
    // 这里需要调用邮件发送服务
    // await sendVerificationEmail(email, userProfile.username, verificationCode, verificationToken);
    
    res.json({
      success: true,
      message: '验证邮件已重新发送',
      verification_code: verificationCode // 开发测试用
    });
    
  } catch (error) {
    console.error('重新发送验证邮件失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`验证API服务运行在端口 ${PORT}`);
});

module.exports = app;
