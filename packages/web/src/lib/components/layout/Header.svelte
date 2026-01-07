<script lang="ts">
  import { currentUser } from '$lib/stores/auth';
  import { Menu, User, LogOut, Settings, Bell } from 'lucide-svelte';
  import { NatterboxLogo } from '$lib/components/ui';

  interface Props {
    onMenuClick?: () => void;
  }

  let { onMenuClick }: Props = $props();

  let userMenuOpen = $state(false);

  function getInitials(name?: string, email?: string): string {
    if (name) {
      const parts = name.split(' ');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    if (email) {
      const localPart = email.split('@')[0];
      const parts = localPart.split('.');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return localPart.substring(0, 2).toUpperCase();
    }
    return 'U';
  }

  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-menu-container')) {
      userMenuOpen = false;
    }
  }

  $effect(() => {
    if (userMenuOpen) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  });

  let initials = $derived(getInitials($currentUser?.name, $currentUser?.email));
</script>

<div class="header-content">
  <div class="header-left">
    <button
      onclick={onMenuClick}
      class="menu-btn lg:hidden"
      aria-label="Toggle menu"
    >
      <Menu class="w-5 h-5" />
    </button>

    <div class="logo-icon">
      <NatterboxLogo size={32} />
    </div>
    <h1 class="app-title">Natterbox AVS</h1>
  </div>

  <div class="header-right">
    <!-- Notifications -->
    <button class="icon-btn" aria-label="Notifications">
      <Bell class="w-5 h-5" />
      <span class="notification-dot"></span>
    </button>

    <!-- User Menu -->
    {#if $currentUser}
      <div class="user-menu-container">
        <div class="user-info">
          <div class="user-initials">
            {initials}
          </div>
          <span class="user-name">{$currentUser.name || $currentUser.email}</span>
        </div>

        <button
          onclick={() => (userMenuOpen = !userMenuOpen)}
          class="icon-btn"
          aria-expanded={userMenuOpen}
          aria-haspopup="menu"
          aria-label="User menu"
        >
          <Settings class="w-5 h-5" />
        </button>

        {#if userMenuOpen}
          <div class="user-dropdown" role="menu">
            <div class="dropdown-header">
              <p class="dropdown-name">{$currentUser.name}</p>
              <p class="dropdown-email">{$currentUser.email}</p>
            </div>
            <a href="/my-profile" class="dropdown-item" role="menuitem">
              <User class="w-4 h-4" />
              <span>My Profile</span>
            </a>
            <a href="/settings" class="dropdown-item" role="menuitem">
              <Settings class="w-4 h-4" />
              <span>Settings</span>
            </a>
            <form action="/auth/logout" method="POST">
              <button type="submit" class="dropdown-item danger" role="menuitem">
                <LogOut class="w-4 h-4" />
                <span>Sign out</span>
              </button>
            </form>
          </div>
        {/if}
      </div>
    {:else}
      <a href="/auth/login" class="btn btn-primary">
        Sign in
      </a>
    {/if}
  </div>
</div>

<style>
  .header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    height: 100%;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .menu-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: transparent;
    border: none;
    color: rgb(var(--color-surface-300));
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .menu-btn:hover {
    background: rgb(var(--color-surface-700));
    color: rgb(var(--color-surface-100));
  }

  .logo-icon {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .app-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: rgb(var(--color-surface-50));
    margin: 0;
    letter-spacing: -0.01em;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: transparent;
    border: 1px solid rgb(var(--color-surface-600));
    color: rgb(var(--color-surface-300));
    cursor: pointer;
    transition: all 0.15s ease;
    position: relative;
  }

  .icon-btn:hover {
    background: rgb(var(--color-surface-700));
    color: rgb(var(--color-surface-100));
    border-color: rgb(var(--color-surface-500));
  }

  .notification-dot {
    position: absolute;
    top: 6px;
    right: 6px;
    width: 8px;
    height: 8px;
    background: rgb(239, 68, 68);
    border-radius: 50%;
  }

  .user-menu-container {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    position: relative;
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 0.625rem;
  }

  .user-initials {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: linear-gradient(135deg, rgb(var(--color-primary-500)), rgb(var(--color-secondary-500)));
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.875rem;
    font-weight: 600;
    color: white;
  }

  .user-name {
    font-size: 0.875rem;
    color: rgb(var(--color-surface-200));
    max-width: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @media (max-width: 768px) {
    .user-name {
      display: none;
    }
  }

  .user-dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 0.5rem;
    width: 220px;
    background: rgb(var(--color-surface-800));
    border: 1px solid rgb(var(--color-surface-600));
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
    z-index: 50;
    overflow: hidden;
  }

  .dropdown-header {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid rgb(var(--color-surface-700));
  }

  .dropdown-name {
    font-weight: 500;
    color: rgb(var(--color-surface-100));
    margin: 0;
  }

  .dropdown-email {
    font-size: 0.75rem;
    color: rgb(var(--color-surface-400));
    margin: 0.25rem 0 0 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    padding: 0.75rem 1rem;
    background: transparent;
    border: none;
    color: rgb(var(--color-surface-200));
    font-size: 0.875rem;
    text-decoration: none;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .dropdown-item:hover {
    background: rgb(var(--color-surface-700));
  }

  .dropdown-item.danger {
    color: rgb(248, 113, 113);
  }

  .dropdown-item.danger:hover {
    background: rgba(239, 68, 68, 0.1);
  }
</style>
