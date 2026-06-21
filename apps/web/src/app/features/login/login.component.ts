import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected username = signal('');
  protected password = signal('');
  protected error = signal('');
  protected loading = signal(false);

  protected async submit(): Promise<void> {
    this.error.set('');
    this.loading.set(true);
    try {
      await this.auth.login(this.username(), this.password());
      await this.router.navigate(['/']);
    } catch {
      this.error.set('Username atau password salah.');
    } finally {
      this.loading.set(false);
    }
  }
}
