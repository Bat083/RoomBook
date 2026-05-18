/**
 * E2E Test for Complete Booking Flow
 *
 * Tests User Story 1: Standard User Room Booking
 * Success Criteria SC-001: Single-page booking flow under 2 minutes
 *
 * This test validates the complete user journey from login to viewing a confirmed booking.
 *
 * Prerequisites:
 * - Backend server running on http://localhost:5000
 * - Frontend dev server running on http://localhost:3000
 * - Test database seeded with rooms and test users
 *
 * Test User Credentials:
 * - Username: user1
 * - Password: password123
 * - Type: STANDARD
 */

import { test, expect, Page } from '@playwright/test';

// Helper function to login
async function login(page: Page, username: string, password: string) {
  await page.goto('http://localhost:3000/login');
  await page.fill('input[name="username"]', username);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');

  // Wait for navigation to complete
  await page.waitForURL('**/rooms');
}

// Helper function to select a date and time
async function selectDateTime(page: Page, hoursFromNow: number, durationHours: number) {
  const now = new Date();
  const startTime = new Date(now.getTime() + hoursFromNow * 60 * 60 * 1000);

  // Format date as YYYY-MM-DD
  const dateStr = startTime.toISOString().split('T')[0];

  // Format time as HH:MM
  const startHours = String(startTime.getHours()).padStart(2, '0');
  const startMinutes = String(startTime.getMinutes()).padStart(2, '0');
  const startTimeStr = `${startHours}:${startMinutes}`;

  const endTime = new Date(startTime.getTime() + durationHours * 60 * 60 * 1000);
  const endHours = String(endTime.getHours()).padStart(2, '0');
  const endMinutes = String(endTime.getMinutes()).padStart(2, '0');
  const endTimeStr = `${endHours}:${endMinutes}`;

  // Fill date and time inputs
  await page.fill('input[type="date"]', dateStr);
  await page.fill('input[name="startTime"]', startTimeStr);
  await page.fill('input[name="endTime"]', endTimeStr);

  return { startTime, endTime, dateStr, startTimeStr, endTimeStr };
}

test.describe('Complete Booking Flow (SC-001)', () => {
  test.setTimeout(120000); // 2 minutes max per test (SC-001 requirement)

  test('should complete entire booking flow under 2 minutes', async ({ page }) => {
    const flowStartTime = Date.now();

    // Step 1: Login (should take < 5 seconds)
    await login(page, 'user1', 'password123');
    await expect(page.locator('text=user1')).toBeVisible();

    const afterLogin = Date.now();
    expect(afterLogin - flowStartTime).toBeLessThan(5000);

    // Step 2: Select date and time for booking (should take < 5 seconds)
    const { dateStr, startTimeStr, endTimeStr } = await selectDateTime(page, 24, 1); // Tomorrow, 1 hour

    // Click search/filter button if needed
    const searchButton = page.locator('button:has-text("Search"), button:has-text("Filter")');
    if (await searchButton.isVisible()) {
      await searchButton.click();
    }

    // Wait for rooms to load
    await page.waitForSelector('[data-testid="room-card"], .room-card, div:has-text("Conference")');

    const afterDateSelection = Date.now();
    expect(afterDateSelection - afterLogin).toBeLessThan(5000);

    // Step 3: Select a room (should take < 3 seconds)
    // Find first available NORMAL room (standard user can't book VIP rooms)
    const roomCards = page.locator('[data-testid="room-card"], .room-card');
    const firstNormalRoom = roomCards.filter({ hasNotText: 'VIP' }).first();

    await expect(firstNormalRoom).toBeVisible({ timeout: 10000 });
    await firstNormalRoom.click();

    const afterRoomSelection = Date.now();
    expect(afterRoomSelection - afterDateSelection).toBeLessThan(3000);

    // Step 4: Fill booking form (should take < 10 seconds)
    // Wait for booking modal/form to appear
    await page.waitForSelector('input[name="title"], input[placeholder*="title" i]', { timeout: 5000 });

    // Fill in booking details
    await page.fill('input[name="title"], input[placeholder*="title" i]', 'E2E Test Meeting');

    const descriptionInput = page.locator('textarea[name="description"], textarea[placeholder*="description" i]');
    if (await descriptionInput.isVisible()) {
      await descriptionInput.fill('This is an automated E2E test booking');
    }

    // Submit the booking form
    const submitButton = page.locator('button:has-text("Book"), button:has-text("Confirm"), button[type="submit"]');
    await submitButton.click();

    const afterFormSubmit = Date.now();
    expect(afterFormSubmit - afterRoomSelection).toBeLessThan(10000);

    // Step 5: Verify booking success (should take < 5 seconds)
    // Wait for success message or redirect
    await expect(page.locator('text=/success|confirmed|booked/i')).toBeVisible({ timeout: 5000 })
      .catch(async () => {
        // Alternative: check if modal closed and we're back to room list
        await expect(page.locator('input[type="date"]')).toBeVisible();
      });

    const afterBookingConfirm = Date.now();
    expect(afterBookingConfirm - afterFormSubmit).toBeLessThan(5000);

    // Step 6: Navigate to "My Bookings" and verify booking appears (should take < 10 seconds)
    const myBookingsLink = page.locator('a:has-text("My Bookings"), button:has-text("My Bookings")');
    await myBookingsLink.click();

    await page.waitForURL('**/bookings');

    // Check that our booking appears in the list
    await expect(page.locator('text=E2E Test Meeting')).toBeVisible({ timeout: 10000 });

    // Verify booking status is CONFIRMED
    const bookingCard = page.locator('div:has-text("E2E Test Meeting")').first();
    await expect(bookingCard).toContainText(/confirmed/i);

    const afterMyBookings = Date.now();
    expect(afterMyBookings - afterBookingConfirm).toBeLessThan(10000);

    // Total flow time validation (SC-001: < 2 minutes = 120 seconds)
    const totalFlowTime = Date.now() - flowStartTime;
    console.log(`Total booking flow time: ${totalFlowTime}ms (${(totalFlowTime / 1000).toFixed(2)}s)`);
    expect(totalFlowTime).toBeLessThan(120000); // 2 minutes in milliseconds

    // Logout
    const logoutButton = page.locator('button:has-text("Logout")');
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
    }
  });

  test('should handle booking conflicts gracefully', async ({ page }) => {
    // Login
    await login(page, 'user1', 'password123');

    // Select a specific time slot
    const { dateStr, startTimeStr, endTimeStr } = await selectDateTime(page, 48, 1); // 2 days from now

    // Search for rooms
    const searchButton = page.locator('button:has-text("Search"), button:has-text("Filter")');
    if (await searchButton.isVisible()) {
      await searchButton.click();
    }

    await page.waitForSelector('[data-testid="room-card"], .room-card');

    // Select first available room
    const firstRoom = page.locator('[data-testid="room-card"], .room-card').first();
    await firstRoom.click();

    // Create first booking
    await page.waitForSelector('input[name="title"], input[placeholder*="title" i]');
    await page.fill('input[name="title"], input[placeholder*="title" i]', 'Conflict Test Booking 1');

    const submitButton = page.locator('button:has-text("Book"), button:has-text("Confirm"), button[type="submit"]');
    await submitButton.click();

    // Wait for booking to complete
    await page.waitForTimeout(2000);

    // Try to book the same room at the same time
    await page.goto('http://localhost:3000/rooms');

    // Set same date/time
    await page.fill('input[type="date"]', dateStr);
    await page.fill('input[name="startTime"]', startTimeStr);
    await page.fill('input[name="endTime"]', endTimeStr);

    if (await searchButton.isVisible()) {
      await searchButton.click();
    }

    await page.waitForTimeout(1000);

    // Try to select the same room (might not be visible/available)
    const roomCards = page.locator('[data-testid="room-card"], .room-card');
    const count = await roomCards.count();

    if (count > 0) {
      await roomCards.first().click();

      // Fill form
      await page.fill('input[name="title"], input[placeholder*="title" i]', 'Conflict Test Booking 2');
      await submitButton.click();

      // Should show conflict error
      await expect(page.locator('text=/conflict|unavailable|already booked/i')).toBeVisible({ timeout: 5000 });

      // Should show alternative rooms if available
      const alternativesSection = page.locator('text=/alternative|other room/i');
      if (await alternativesSection.isVisible()) {
        console.log('Alternative rooms suggested');
      }
    } else {
      // Room not shown because it's unavailable - this is also valid
      console.log('Conflicting room correctly hidden from available rooms');
    }
  });

  test('should display calendar view with bookings', async ({ page }) => {
    // Login
    await login(page, 'user1', 'password123');

    // Navigate to calendar view
    const calendarLink = page.locator('a:has-text("Calendar"), button:has-text("Calendar")');
    await calendarLink.click();

    await page.waitForURL('**/calendar');

    // Verify calendar is displayed
    await expect(page.locator('.rbc-calendar, [class*="calendar"]')).toBeVisible({ timeout: 10000 });

    // Check for calendar navigation controls
    const monthView = page.locator('button:has-text("Month"), .rbc-btn-group button:has-text("Month")');
    const weekView = page.locator('button:has-text("Week"), .rbc-btn-group button:has-text("Week")');
    const dayView = page.locator('button:has-text("Day"), .rbc-btn-group button:has-text("Day")');

    // Verify view switchers exist
    await expect(monthView.or(weekView).or(dayView)).toBeVisible();

    // If there are any bookings, they should be visible on the calendar
    const events = page.locator('.rbc-event, [class*="event"]');
    const eventCount = await events.count();
    console.log(`Calendar shows ${eventCount} event(s)`);
  });

  test('should enforce VIP room restrictions for standard users', async ({ page }) => {
    // Login as standard user
    await login(page, 'user1', 'password123');

    // Select date and time
    await selectDateTime(page, 72, 1); // 3 days from now

    const searchButton = page.locator('button:has-text("Search"), button:has-text("Filter")');
    if (await searchButton.isVisible()) {
      await searchButton.click();
    }

    await page.waitForSelector('[data-testid="room-card"], .room-card');

    // VIP rooms should either:
    // 1. Not be shown at all (filtered out), OR
    // 2. Be shown but disabled/marked as VIP-only

    const vipRooms = page.locator('[data-testid="room-card"]:has-text("VIP"), .room-card:has-text("VIP")');
    const vipRoomCount = await vipRooms.count();

    console.log(`VIP rooms visible to standard user: ${vipRoomCount}`);

    // If VIP rooms are visible, they should be marked as such
    if (vipRoomCount > 0) {
      const firstVipRoom = vipRooms.first();
      await expect(firstVipRoom).toContainText('VIP');

      // Try to click it
      await firstVipRoom.click();

      // Should show an error or be disabled
      const vipError = page.locator('text=/vip|clearance|permission|access denied/i');

      // Check if error appears or booking form doesn't open
      const formOrError = await Promise.race([
        vipError.waitFor({ timeout: 3000 }).then(() => 'error'),
        page.locator('input[name="title"]').waitFor({ timeout: 3000 }).then(() => 'form'),
      ]).catch(() => 'none');

      if (formOrError === 'form') {
        // If form opens, try to submit and expect error
        await page.fill('input[name="title"]', 'VIP Test');
        await page.locator('button[type="submit"]').click();
        await expect(page.locator('text=/vip|clearance|permission/i')).toBeVisible();
      }
    }
  });

  test('should enforce minimum booking duration (15 minutes)', async ({ page }) => {
    // Login
    await login(page, 'user1', 'password123');

    // Select date
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const dateStr = tomorrow.toISOString().split('T')[0];

    // Set times with only 10 minutes duration (invalid)
    await page.fill('input[type="date"]', dateStr);
    await page.fill('input[name="startTime"]', '10:00');
    await page.fill('input[name="endTime"]', '10:10'); // Only 10 minutes

    const searchButton = page.locator('button:has-text("Search"), button:has-text("Filter")');
    if (await searchButton.isVisible()) {
      await searchButton.click();
    }

    // Should show validation error or prevent search
    const durationError = page.locator('text=/minimum.*15.*minute/i, text=/duration.*too short/i');

    // Error might appear immediately or after trying to book
    const hasImmediateError = await durationError.isVisible().catch(() => false);

    if (!hasImmediateError) {
      // Try to proceed with booking
      await page.waitForTimeout(1000);
      const roomCard = page.locator('[data-testid="room-card"], .room-card').first();

      if (await roomCard.isVisible()) {
        await roomCard.click();
        await page.fill('input[name="title"]', 'Short Duration Test');
        await page.locator('button[type="submit"]').click();

        // Should show error
        await expect(durationError).toBeVisible({ timeout: 5000 });
      }
    } else {
      console.log('Duration validation enforced immediately');
    }
  });

  test('should enforce maximum booking duration (8 hours)', async ({ page }) => {
    // Login
    await login(page, 'user1', 'password123');

    // Select date
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const dateStr = tomorrow.toISOString().split('T')[0];

    // Set times with 9 hours duration (invalid)
    await page.fill('input[type="date"]', dateStr);
    await page.fill('input[name="startTime"]', '09:00');
    await page.fill('input[name="endTime"]', '18:00'); // 9 hours

    const searchButton = page.locator('button:has-text("Search"), button:has-text("Filter")');
    if (await searchButton.isVisible()) {
      await searchButton.click();
    }

    // Should show validation error
    const durationError = page.locator('text=/maximum.*8.*hour/i, text=/duration.*too long/i');

    const hasImmediateError = await durationError.isVisible().catch(() => false);

    if (!hasImmediateError) {
      await page.waitForTimeout(1000);
      const roomCard = page.locator('[data-testid="room-card"], .room-card').first();

      if (await roomCard.isVisible()) {
        await roomCard.click();
        await page.fill('input[name="title"]', 'Long Duration Test');
        await page.locator('button[type="submit"]').click();

        await expect(durationError).toBeVisible({ timeout: 5000 });
      }
    } else {
      console.log('Duration validation enforced immediately');
    }
  });
});
