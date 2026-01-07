<script lang="ts">
  import { page } from '$app/stores';
  import {
    Home,
    User,
    Users,
    UsersRound,
    Phone,
    PhoneCall,
    Settings,
    BarChart3,
    Workflow,
    Bot,
    FileText,
    Activity,
    LayoutGrid,
    MessageSquare,
    Monitor,
    PieChart,
    Cog,
  } from 'lucide-svelte';

  interface Props {
    isOpen?: boolean;
    onClose?: () => void;
  }

  let { isOpen = true, onClose }: Props = $props();

  interface NavItem {
    label: string;
    href: string;
    icon: typeof Users;
  }

  // Flat navigation matching Salesforce menu bar order
  const navigation: NavItem[] = [
    { label: 'Admin Home', href: '/admin', icon: Home },
    { label: 'User Home', href: '/my-profile', icon: User },
    { label: 'Account Settings', href: '/account-settings', icon: Settings },
    { label: 'Natterbox Users', href: '/users', icon: Users },
    { label: 'AI Advisor', href: '/ai-advisor', icon: Bot },
    { label: 'AI Advisor Settings', href: '/ai-advisor/settings', icon: Cog },
    { label: 'Phone Numbers', href: '/phone-numbers', icon: PhoneCall },
    { label: 'Devices', href: '/devices', icon: Phone },
    { label: 'Groups', href: '/groups', icon: UsersRound },
    { label: 'Routing Policies', href: '/routing-policies', icon: Workflow },
    { label: 'Call Logs and Recordings', href: '/call-logs', icon: FileText },
    { label: 'Call Status', href: '/call-status', icon: Activity },
    { label: 'Wallboards', href: '/wallboards', icon: LayoutGrid },
    { label: 'Natterbox Messaging', href: '/messaging', icon: MessageSquare },
    { label: 'Natterbox Monitoring', href: '/monitoring', icon: Monitor },
    { label: 'Call Reporting', href: '/call-reporting', icon: PieChart },
  ];

  function isActive(href: string): boolean {
    if (href === '/') {
      return $page.url.pathname === '/';
    }
    return $page.url.pathname === href || $page.url.pathname.startsWith(href + '/');
  }
</script>

<nav class="sidebar-nav">
  {#each navigation as item}
    <a
      href={item.href}
      onclick={onClose}
      class="nav-item"
      class:selected={isActive(item.href)}
    >
      <item.icon class="nav-icon" />
      <span class="nav-label">{item.label}</span>
    </a>
  {/each}
</nav>

<style>
  .sidebar-nav {
    display: flex;
    flex-direction: column;
    padding: 0.5rem;
    gap: 1px;
    overflow-y: auto;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0.625rem;
    background: transparent;
    border-radius: 4px;
    color: rgb(var(--color-surface-300));
    font-size: 0.8125rem;
    text-decoration: none;
    cursor: pointer;
    transition: all 0.1s ease;
    white-space: nowrap;
  }

  .nav-item:hover {
    background: rgb(var(--color-surface-700));
    color: rgb(var(--color-surface-100));
  }

  .nav-item.selected {
    background: rgba(var(--color-primary-500), 0.15);
    color: rgb(var(--color-primary-400));
  }

  .nav-item.selected :global(.nav-icon) {
    color: rgb(var(--color-primary-400));
  }

  :global(.nav-icon) {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
    color: rgb(var(--color-surface-400));
    transition: color 0.1s ease;
  }

  .nav-item:hover :global(.nav-icon) {
    color: rgb(var(--color-surface-200));
  }

  .nav-label {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
