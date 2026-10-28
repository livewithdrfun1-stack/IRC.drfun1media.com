import React, { useState } from 'react';
import {
  Download,
  Copy,
  Check,
  FileCode,
  Globe,
  Settings,
  Code2,
  ExternalLink,
  Layers,
  Sparkles,
  ShieldCheck,
  Hash,
  Terminal,
} from 'lucide-react';
import JSZip from 'jszip';

interface WordPressSuiteProps {
  appUrl: string;
}

export function WordPressSuite({ appUrl }: WordPressSuiteProps) {
  const [activeTab, setActiveTab] = useState<'generator' | 'code' | 'preview'>('generator');
  const [selectedChannel, setSelectedChannel] = useState('#drfun1');
  const [embedHeight, setEmbedHeight] = useState('650px');
  const [embedTheme, setEmbedTheme] = useState<'dark' | 'light'>('dark');
  const [nickPrefix, setNickPrefix] = useState('WP_');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedShortcode, setCopiedShortcode] = useState(false);
  const [copiedIframe, setCopiedIframe] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Computed Embed URLs & Shortcodes
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : appUrl;
  const shortcodeSnippet = `[drfun1_irc_chat channel="${selectedChannel}" height="${embedHeight}" theme="${embedTheme}"]`;
  const iframeSnippet = `<iframe src="${currentOrigin}/?embed=1&channel=${encodeURIComponent(
    selectedChannel
  )}&theme=${embedTheme}" width="100%" height="${embedHeight}" style="border:0; border-radius:12px; overflow:hidden;" allow="clipboard-write"></iframe>`;

  const WORDPRESS_PHP_CODE = `<?php
/**
 * Plugin Name: DrFun1 IRCd Web Client & Duplicator
 * Plugin URI: https://drfun1.com
 * Description: Connect WordPress sites directly to irc.drfun1.com (port 6697 SSL/TLS). Features live chat client embed, channel search engine, network stats, and channel stream duplicator.
 * Version: 1.0.0
 * Author: DrFun1 IRC Network
 * Author URI: https://drfun1.com
 * License: GPL2 or later
 * Text Domain: drfun1-ircd
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly.
}

class DrFun1_IRCd_Plugin {
    const OPTION_SERVER_HOST = 'drfun1_irc_host';
    const OPTION_SERVER_PORT = 'drfun1_irc_port';
    const OPTION_DEFAULT_CHAN = 'drfun1_irc_default_channel';
    const OPTION_APP_URL = 'drfun1_irc_client_url';

    public function __construct() {
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
        add_shortcode('drfun1_irc_chat', array($this, 'render_chat_shortcode'));
        add_shortcode('drfun1_irc_stats', array($this, 'render_stats_shortcode'));
        add_shortcode('drfun1_irc_channels', array($this, 'render_channels_shortcode'));
        add_action('widgets_init', array($this, 'register_widgets'));
    }

    public function register_settings() {
        register_setting('drfun1_irc_options', self::OPTION_SERVER_HOST, array('default' => 'irc.drfun1.com'));
        register_setting('drfun1_irc_options', self::OPTION_SERVER_PORT, array('default' => '6697'));
        register_setting('drfun1_irc_options', self::OPTION_DEFAULT_CHAN, array('default' => '#drfun1'));
        register_setting('drfun1_irc_options', self::OPTION_APP_URL, array('default' => '${currentOrigin}'));
    }

    public function add_admin_menu() {
        add_options_page(
            __('DrFun1 IRCd Settings', 'drfun1-ircd'),
            __('DrFun1 IRCd Chat', 'drfun1-ircd'),
            'manage_options',
            'drfun1-ircd-settings',
            array($this, 'render_settings_page')
        );
    }

    public function render_settings_page() {
        $host = get_option(self::OPTION_SERVER_HOST, 'irc.drfun1.com');
        $port = get_option(self::OPTION_SERVER_PORT, '6697');
        $chan = get_option(self::OPTION_DEFAULT_CHAN, '#drfun1');
        $client_url = get_option(self::OPTION_APP_URL, '${currentOrigin}');
        ?>
        <div class="wrap">
            <h1><?php echo esc_html__('DrFun1 IRCd Client & Duplicator Settings', 'drfun1-ircd'); ?></h1>
            <p><?php echo esc_html__('Configure the connection to irc.drfun1.com SSL/TLS port 6697 and embedded web chat shortcodes.', 'drfun1-ircd'); ?></p>
            <form method="post" action="options.php">
                <?php settings_fields('drfun1_irc_options'); ?>
                <table class="form-table">
                    <tr>
                        <th scope="row"><?php esc_html_e('IRC Server Host', 'drfun1-ircd'); ?></th>
                        <td><input type="text" name="<?php echo self::OPTION_SERVER_HOST; ?>" value="<?php echo esc_attr($host); ?>" class="regular-text" readonly /></td>
                    </tr>
                    <tr>
                        <th scope="row"><?php esc_html_e('TLS/SSL Port', 'drfun1-ircd'); ?></th>
                        <td><input type="number" name="<?php echo self::OPTION_SERVER_PORT; ?>" value="<?php echo esc_attr($port); ?>" class="small-text" readonly />
                        <p class="description"><?php esc_html_e('Port 6697 (SSL/TLS required)', 'drfun1-ircd'); ?></p></td>
                    </tr>
                    <tr>
                        <th scope="row"><?php esc_html_e('Default Channel', 'drfun1-ircd'); ?></th>
                        <td><input type="text" name="<?php echo self::OPTION_DEFAULT_CHAN; ?>" value="<?php echo esc_attr($chan); ?>" class="regular-text" /></td>
                    </tr>
                    <tr>
                        <th scope="row"><?php esc_html_e('Web Client Gateway URL', 'drfun1-ircd'); ?></th>
                        <td><input type="url" name="<?php echo self::OPTION_APP_URL; ?>" value="<?php echo esc_attr($client_url); ?>" class="large-text" /></td>
                    </tr>
                </table>
                <?php submit_button(); ?>
            </form>
            <hr />
            <h2><?php esc_html_e('Available Shortcodes', 'drfun1-ircd'); ?></h2>
            <p><code>[drfun1_irc_chat channel="#drfun1" height="650px"]</code></p>
            <p><code>[drfun1_irc_stats]</code></p>
            <p><code>[drfun1_irc_channels]</code></p>
        </div>
        <?php
    }

    public function render_chat_shortcode($atts) {
        $a = shortcode_atts(array(
            'channel' => get_option(self::OPTION_DEFAULT_CHAN, '#drfun1'),
            'height'  => '650px',
            'theme'   => 'dark',
            'nick'    => '',
        ), $atts);

        $client_url = get_option(self::OPTION_APP_URL, '${currentOrigin}');
        if (is_user_logged_in() && empty($a['nick'])) {
            $current_user = wp_get_current_user();
            $a['nick'] = sanitize_user($current_user->display_name, true);
        }

        $embed_src = add_query_arg(array(
            'embed'   => '1',
            'channel' => urlencode($a['channel']),
            'theme'   => urlencode($a['theme']),
            'nick'    => urlencode($a['nick']),
        ), $client_url);

        return sprintf(
            '<div class="drfun1-irc-embed-container" style="width: 100%%; max-width: 1200px; margin: 1.5rem auto; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3); border: 1px solid #1e293b;">
                <iframe src="%s" width="100%%" height="%s" style="border:0; display:block; background:#0c0f17;" allow="clipboard-write" loading="lazy"></iframe>
            </div>',
            esc_url($embed_src),
            esc_attr($a['height'])
        );
    }

    public function render_stats_shortcode($atts) {
        $client_url = get_option(self::OPTION_APP_URL, '${currentOrigin}');
        $embed_src = add_query_arg(array('embed' => '1', 'view' => 'stats'), $client_url);
        return sprintf(
            '<div class="drfun1-irc-stats-embed" style="width: 100%%; margin: 1rem auto;">
                <iframe src="%s" width="100%%" height="480px" style="border:0; border-radius: 8px; background:#0c0f17;" loading="lazy"></iframe>
            </div>',
            esc_url($embed_src)
        );
    }

    public function render_channels_shortcode($atts) {
        $client_url = get_option(self::OPTION_APP_URL, '${currentOrigin}');
        $embed_src = add_query_arg(array('embed' => '1', 'view' => 'channels'), $client_url);
        return sprintf(
            '<div class="drfun1-irc-channels-embed" style="width: 100%%; margin: 1rem auto;">
                <iframe src="%s" width="100%%" height="520px" style="border:0; border-radius: 8px; background:#0c0f17;" loading="lazy"></iframe>
            </div>',
            esc_url($embed_src)
        );
    }

    public function register_widgets() {
        register_widget('DrFun1_IRC_Widget');
    }
}

class DrFun1_IRC_Widget extends WP_Widget {
    public function __construct() {
        parent::__construct(
            'drfun1_irc_widget',
            __('DrFun1 IRC Chat Widget', 'drfun1-ircd'),
            array('description' => __('Display live irc.drfun1.com chat or channel list in your sidebar.', 'drfun1-ircd'))
        );
    }

    public function widget($args, $instance) {
        echo $args['before_widget'];
        if (!empty($instance['title'])) {
            echo $args['before_title'] . apply_filters('widget_title', $instance['title']) . $args['after_title'];
        }
        $chan = !empty($instance['channel']) ? $instance['channel'] : '#drfun1';
        echo do_shortcode('[drfun1_irc_chat channel="' . esc_attr($chan) . '" height="420px"]');
        echo $args['after_widget'];
    }

    public function form($instance) {
        $title = !empty($instance['title']) ? $instance['title'] : __('Community Chat', 'drfun1-ircd');
        $channel = !empty($instance['channel']) ? $instance['channel'] : '#drfun1';
        ?>
        <p>
            <label for="<?php echo esc_attr($this->get_field_id('title')); ?>"><?php esc_html_e('Title:', 'drfun1-ircd'); ?></label>
            <input class="widefat" id="<?php echo esc_attr($this->get_field_id('title')); ?>" name="<?php echo esc_attr($this->get_field_name('title')); ?>" type="text" value="<?php echo esc_attr($title); ?>">
        </p>
        <p>
            <label for="<?php echo esc_attr($this->get_field_id('channel')); ?>"><?php esc_html_e('Channel:', 'drfun1-ircd'); ?></label>
            <input class="widefat" id="<?php echo esc_attr($this->get_field_id('channel')); ?>" name="<?php echo esc_attr($this->get_field_name('channel')); ?>" type="text" value="<?php echo esc_attr($channel); ?>">
        </p>
        <?php
    }

    public function update($new_instance, $old_instance) {
        $instance = array();
        $instance['title'] = (!empty($new_instance['title'])) ? sanitize_text_field($new_instance['title']) : '';
        $instance['channel'] = (!empty($new_instance['channel'])) ? sanitize_text_field($new_instance['channel']) : '#drfun1';
        return $instance;
    }
}

new DrFun1_IRCd_Plugin();
`;

  const README_TXT = `=== DrFun1 IRCd Web Client & Duplicator ===
Contributors: drfun1
Tags: irc, chat, webchat, duplicator, tls, ssl, community
Requires at least: 5.4
Tested up to: 6.7
Stable tag: 1.0.0
License: GPLv2 or later

Connect your WordPress blog or community site directly to irc.drfun1.com on TLS port 6697.

== Description ==

DrFun1 IRCd Web Client & Duplicator embeds full-featured, secure IRC chat rooms, real-time channel directories, and network telemetry directly into WordPress pages, posts, or sidebars.

Features:
* Direct SSL/TLS connection on port 6697 to irc.drfun1.com
* Cross-channel chat stream duplicator and message mirroring
* Full channel search engine and active user counts
* Tab-completion, nick colors, oper/voice indicators
* Syncs logged-in WordPress username to IRC guest nick
* Mobile-responsive and dark/light themes

== Installation ==

1. Upload the 'drfun1-ircd-chat' folder to your '/wp-content/plugins/' directory (or upload the .zip in Plugins > Add New).
2. Activate the plugin through the 'Plugins' menu in WordPress.
3. Configure default settings under Settings > DrFun1 IRCd Chat.
4. Insert shortcode [drfun1_irc_chat channel="#drfun1"] into any page.
`;

  const handleDownloadZip = async () => {
    setIsDownloading(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder('drfun1-ircd-chat');
      folder?.file('drfun1-ircd-chat.php', WORDPRESS_PHP_CODE);
      folder?.file('readme.txt', README_TXT);

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'drfun1-ircd-chat.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('ZIP generation failed:', e);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(WORDPRESS_PHP_CODE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyShortcode = () => {
    navigator.clipboard.writeText(shortcodeSnippet);
    setCopiedShortcode(true);
    setTimeout(() => setCopiedShortcode(false), 2000);
  };

  const handleCopyIframe = () => {
    navigator.clipboard.writeText(iframeSnippet);
    setCopiedIframe(true);
    setTimeout(() => setCopiedIframe(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5">
            <Globe className="w-6 h-6 text-sky-400" />
            WordPress Plugin Generator & Embed Suite
          </h1>
          <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-400">
            <span>Plugin: drfun1-ircd-chat v1.0.0</span>
            <span aria-hidden="true">·</span>
            <span>Target: irc.drfun1.com:6697 SSL/TLS</span>
            <span aria-hidden="true">·</span>
            <span>GPLv2 Licensed</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleDownloadZip}
            disabled={isDownloading}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-md transition-colors shadow-sm disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isDownloading ? 'Packaging ZIP...' : 'Download Plugin (.zip)'}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('generator')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            activeTab === 'generator'
              ? 'bg-sky-600/20 text-sky-400 border border-sky-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Shortcode & Embed Generator</span>
        </button>

        <button
          onClick={() => setActiveTab('code')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            activeTab === 'code'
              ? 'bg-sky-600/20 text-sky-400 border border-sky-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>Plugin PHP Source Code</span>
        </button>

        <button
          onClick={() => setActiveTab('preview')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            activeTab === 'preview'
              ? 'bg-sky-600/20 text-sky-400 border border-sky-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>WordPress Post Live Preview</span>
        </button>
      </div>

      {/* TAB 1: Shortcode & Embed Generator */}
      {activeTab === 'generator' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Customizer Controls */}
            <div className="bg-[#111728] border border-slate-800 rounded-lg p-5 space-y-4">
              <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2 pb-3 border-b border-slate-800">
                <Settings className="w-4 h-4 text-sky-400" />
                Customize Embed
              </h2>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Default IRC Channel
                </label>
                <div className="relative">
                  <Hash className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={selectedChannel}
                    onChange={(e) => setSelectedChannel(e.target.value)}
                    placeholder="#drfun1"
                    className="w-full bg-[#0b0f19] border border-slate-700 rounded pl-8 pr-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div className="flex gap-2 mt-1.5 text-[11px] text-slate-400 font-mono">
                  {['#drfun1', '#general', '#radio', '#wordpress'].map((c) => (
                    <button
                      key={c}
                      onClick={() => setSelectedChannel(c)}
                      className="hover:text-sky-300 hover:underline"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Container Height
                </label>
                <select
                  value={embedHeight}
                  onChange={(e) => setEmbedHeight(e.target.value)}
                  className="w-full bg-[#0b0f19] border border-slate-700 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                >
                  <option value="500px">Compact (500px)</option>
                  <option value="650px">Standard (650px)</option>
                  <option value="800px">Large Full-Page (800px)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Theme Palette
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setEmbedTheme('dark')}
                    className={`py-2 px-3 rounded border font-medium transition-colors ${
                      embedTheme === 'dark'
                        ? 'bg-sky-950/60 border-sky-500/60 text-sky-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Dark Slate
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmbedTheme('light')}
                    className={`py-2 px-3 rounded border font-medium transition-colors ${
                      embedTheme === 'light'
                        ? 'bg-sky-950/60 border-sky-500/60 text-sky-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    High Contrast
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Guest Nickname Prefix
                </label>
                <input
                  type="text"
                  value={nickPrefix}
                  onChange={(e) => setNickPrefix(e.target.value)}
                  placeholder="WP_"
                  className="w-full bg-[#0b0f19] border border-slate-700 rounded px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-sky-500"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Maps WordPress display names or random guest nicks
                </span>
              </div>
            </div>

            {/* Generated Code Boxes */}
            <div className="md:col-span-2 space-y-4">
              {/* Shortcode Box */}
              <div className="bg-[#111728] border border-slate-800 rounded-lg p-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                  <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <FileCode className="w-4 h-4 text-sky-400" />
                    WordPress Shortcode
                  </h3>
                  <button
                    onClick={handleCopyShortcode}
                    className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 font-medium"
                  >
                    {copiedShortcode ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Shortcode</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-[#0b0f19] border border-slate-800/80 rounded p-3 font-mono text-xs text-sky-300 break-all select-all">
                  {shortcodeSnippet}
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  Paste this shortcode into any Gutenberg Block, Elementor text block, or Classic Editor page.
                </p>
              </div>

              {/* Statistics & Directory Shortcodes */}
              <div className="bg-[#111728] border border-slate-800 rounded-lg p-5">
                <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">
                  Additional Shortcodes Available
                </h3>
                <div className="space-y-3 text-xs font-mono">
                  <div className="p-3 bg-[#0b0f19] rounded border border-slate-800/80 flex items-center justify-between">
                    <div>
                      <code className="text-emerald-400">[drfun1_irc_stats]</code>
                      <span className="text-slate-400 block text-[11px] font-sans mt-0.5">
                        Embeds live irc.drfun1.com SSL/TLS network telemetry and active user count.
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-[#0b0f19] rounded border border-slate-800/80 flex items-center justify-between">
                    <div>
                      <code className="text-purple-400">[drfun1_irc_channels]</code>
                      <span className="text-slate-400 block text-[11px] font-sans mt-0.5">
                        Embeds live channel directory search engine with 1-click room joining.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Raw iFrame snippet */}
              <div className="bg-[#111728] border border-slate-800 rounded-lg p-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                  <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Code2 className="w-4 h-4 text-purple-400" />
                    Universal HTML iFrame Embed
                  </h3>
                  <button
                    onClick={handleCopyIframe}
                    className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 font-medium"
                  >
                    {copiedIframe ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy HTML</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="bg-[#0b0f19] border border-slate-800/80 rounded p-3 font-mono text-xs text-slate-300 break-all select-all">
                  {iframeSnippet}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PHP Source Code */}
      {activeTab === 'code' && (
        <div className="bg-[#111728] border border-slate-800 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#0e1424]">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-sky-400" />
              <span className="text-xs font-bold text-slate-200 font-mono">
                drfun1-ircd-chat/drfun1-ircd-chat.php
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied to Clipboard</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Full PHP</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <pre className="p-4 bg-[#080b12] text-slate-300 font-mono text-xs leading-relaxed overflow-x-auto max-h-[600px] select-all">
            {WORDPRESS_PHP_CODE}
          </pre>
        </div>
      )}

      {/* TAB 3: Realistic WordPress Live Preview */}
      {activeTab === 'preview' && (
        <div className="bg-slate-100 dark:bg-[#1a202c] border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden shadow-2xl text-slate-800 dark:text-slate-100">
          {/* Mock Browser Header */}
          <div className="bg-slate-200 dark:bg-slate-800 px-4 py-2 border-b border-slate-300 dark:border-slate-700 flex items-center justify-between text-xs font-sans">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400/80" />
                <div className="w-3 h-3 rounded-full bg-amber-400/80" />
                <div className="w-3 h-3 rounded-full bg-green-400/80" />
              </div>
              <span className="text-slate-500 dark:text-slate-400 ml-2 font-mono text-[11px]">
                https://my-wordpress-site.org/community-chat/
              </span>
            </div>
            <span className="text-slate-500 dark:text-slate-400 text-[11px]">
              WordPress Twenty Twenty-Four Theme Preview
            </span>
          </div>

          {/* WordPress Site Layout Mockup */}
          <div className="p-8 max-w-4xl mx-auto space-y-6">
            <header className="border-b border-slate-200 dark:border-slate-700 pb-4">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Live Community IRC Chat
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-2">
                <span>By DrFun1 Webmaster</span>
                <span>·</span>
                <span>Category: Community</span>
                <span>·</span>
                <span>Connected to irc.drfun1.com:6697 (SSL/TLS)</span>
              </div>
            </header>

            <article className="prose dark:prose-invert max-w-none text-sm text-slate-600 dark:text-slate-300">
              <p>
                Welcome to our official real-time chat lounge powered by irc.drfun1.com on TLS port 6697.
                Jump straight in using the embedded chat shortcode below.
              </p>

              {/* The Embedded Shortcode Output */}
              <div className="my-6 border border-slate-800 rounded-lg overflow-hidden shadow-xl bg-[#0b0f19]">
                <div className="bg-[#0e1424] px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300 font-mono">
                  <div className="flex items-center gap-2">
                    <Hash className="w-3.5 h-3.5 text-sky-400" />
                    <span className="font-bold text-sky-300">{selectedChannel}</span>
                    <span className="text-slate-500">·</span>
                    <span className="text-slate-400">irc.drfun1.com:6697 (TLS)</span>
                  </div>
                  <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>SSL Encrypted</span>
                  </span>
                </div>

                <div className="p-4 font-mono text-xs text-slate-300 space-y-2 bg-[#0b0f19] h-64 overflow-y-auto">
                  <div className="text-slate-500 text-[11px]">
                    *** Welcome to {selectedChannel} on irc.drfun1.com!
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-sky-400 font-bold">&lt;DrFun1_Admin&gt;</span>
                    <span>Welcome everyone to the official WordPress embed stream!</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">&lt;RadioDJ_Live&gt;</span>
                    <span>Live audio streaming is up on irc.drfun1.com!</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-purple-400 font-bold">&lt;WP_Visitor_94&gt;</span>
                    <span>This WordPress plugin is smooth! SSL handshake on port 6697 works directly.</span>
                  </div>
                  <div className="flex items-start gap-2 text-purple-300 bg-purple-950/30 p-1.5 rounded">
                    <span className="font-bold">[Dupe Relay]</span>
                    <span>&lt;RelayMaster&gt; Duplicated message from #general &rarr; {selectedChannel}</span>
                  </div>
                </div>

                <div className="p-2.5 bg-[#0e1424] border-t border-slate-800 flex items-center gap-2">
                  <input
                    type="text"
                    disabled
                    placeholder={`Type a message in ${selectedChannel}...`}
                    className="flex-1 bg-slate-900 border border-slate-700/80 rounded px-3 py-1.5 text-xs text-slate-400 font-mono"
                  />
                  <button
                    disabled
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-sky-600 rounded opacity-60"
                  >
                    Send
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                Rendered with shortcode: <code className="font-mono text-sky-400">{shortcodeSnippet}</code>
              </p>
            </article>
          </div>
        </div>
      )}
    </div>
  );
}
