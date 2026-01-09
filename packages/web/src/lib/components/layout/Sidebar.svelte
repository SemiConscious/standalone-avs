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
    Workflow,
    Bot,
    FileText,
    Activity,
    LayoutGrid,
    MessageSquare,
    Monitor,
    PieChart,
    Cog,
    ChevronDown,
    Smartphone,
    Sparkles,
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

  interface NavGroup {
    label: string;
    items: NavItem[];
    defaultOpen?: boolean;
  }

  // Grouped navigation for better organization
  const navigationGroups: NavGroup[] = [
    {
      label: 'PERSONAL',
      defaultOpen: true,
      items: [
        { label: 'User Home', href: '/my-profile', icon: User },
      ],
    },
    {
      label: 'SETUP',
      defaultOpen: true,
      items: [
        { label: 'Admin Home', href: '/admin', icon: Home },
        { label: 'Account Settings', href: '/account-settings', icon: Settings },
        { label: 'Natterbox Users', href: '/users', icon: Users },
        { label: 'Groups', href: '/groups', icon: UsersRound },
        { label: 'Devices', href: '/devices', icon: Smartphone },
      ],
    },
    {
      label: 'TELEPHONY',
      defaultOpen: true,
      items: [
        { label: 'Phone Numbers', href: '/phone-numbers', icon: PhoneCall },
        { label: 'Routing Policies', href: '/routing-policies', icon: Workflow },
      ],
    },
    {
      label: 'OPERATIONS',
      defaultOpen: true,
      items: [
        { label: 'Call Status', href: '/call-status', icon: Activity },
        { label: 'Call Logs', href: '/call-logs', icon: FileText },
        { label: 'Monitoring', href: '/monitoring', icon: Monitor },
      ],
    },
    {
      label: 'INSIGHTS',
      defaultOpen: false,
      items: [
        { label: 'Insights', href: '/insights', icon: Bot },
        { label: 'Insights Settings', href: '/insights/settings', icon: Cog },
        { label: 'AI Advisor', href: '/ai-advisor', icon: Sparkles },
        { label: 'Call Reporting', href: '/call-reporting', icon: PieChart },
        { label: 'Wallboards', href: '/wallboards', icon: LayoutGrid },
      ],
    },
    {
      label: 'MESSAGING',
      defaultOpen: false,
      items: [
        { label: 'Messaging', href: '/messaging', icon: MessageSquare },
      ],
    },
  ];

  // Track which groups are expanded
  let expandedGroups = $state<Set<string>>(
    new Set(navigationGroups.filter(g => g.defaultOpen).map(g => g.label))
  );

  function toggleGroup(label: string) {
    if (expandedGroups.has(label)) {
      expandedGroups = new Set([...expandedGroups].filter(l => l !== label));
    } else {
      expandedGroups = new Set([...expandedGroups, label]);
    }
  }

  function isActive(href: string): boolean {
    if (href === '/') {
      return $page.url.pathname === '/';
    }
    return $page.url.pathname === href || $page.url.pathname.startsWith(href + '/');
  }

  // Check if any item in a group is active
  function isGroupActive(group: NavGroup): boolean {
    return group.items.some(item => isActive(item.href));
  }
</script>

<nav class="sidebar-nav">
  {#each navigationGroups as group}
    <div class="nav-group">
      <!-- Group Header -->
      <button
        class="group-header"
        class:active={isGroupActive(group)}
        onclick={() => toggleGroup(group.label)}
      >
        <span class="group-label">{group.label}</span>
        <span class="group-chevron" class:expanded={expandedGroups.has(group.label)}>
          <ChevronDown size={12} />
        </span>
      </button>

      <!-- Group Items -->
      {#if expandedGroups.has(group.label)}
        <div class="group-items">
          {#each group.items as item}
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
        </div>
      {/if}
    </div>
  {/each}
</nav>

<style>
  .sidebar-nav {
    display: flex;
    flex-direction: column;
    padding: 0.5rem;
    gap: 0.25rem;
    overflow-y: auto;
  }

  .nav-group {
    margin-bottom: 0.25rem;
  }

  .group-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 0.375rem 0.625rem;
    background: transparent;
    border: none;
    border-radius: 4px;
    color: rgb(var(--color-surface-400));
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .group-header:hover {
    background: rgb(var(--color-surface-800));
    color: rgb(var(--color-surface-300));
  }

  .group-header.active {
    color: rgb(var(--color-primary-400));
  }

  .group-label {
    flex: 1;
    text-align: left;
  }

  .group-chevron {
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s ease;
    opacity: 0.6;
  }

  .group-chevron.expanded {
    transform: rotate(180deg);
  }

  .group-items {
    display: flex;
    flex-direction: column;
    padding-left: 0.5rem;
    margin-top: 0.125rem;
    gap: 1px;
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
