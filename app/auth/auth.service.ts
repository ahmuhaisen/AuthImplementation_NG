import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { BehaviorSubject, catchError, tap, throwError } from "rxjs";
import { User } from "./user.model";
import { Router } from "@angular/router";

export interface AuthResponseData {
    kind: string;
    idToken: string;
    email: string;
    refreshToken: string;
    expiresIn: string;
    localId: string;
    registered?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
    signupUrl = 'https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=AIzaSyCq5apSnbrBKRVEb9fqaCL9r_UVEkAySjc';
    signinUrl = 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyCq5apSnbrBKRVEb9fqaCL9r_UVEkAySjc';

    user = new BehaviorSubject<User>(null);
    private tokenExpirationTimer: any;

    constructor(private httpClient: HttpClient, private router: Router) { }

    signup(email: string, password: string) {
        return this.httpClient
            .post<AuthResponseData>(this.signupUrl,
                {
                    email: email,
                    password: password,
                    returnSecureToken: true
                }
            )
            .pipe(
                catchError(errorRes => this.handleError(errorRes)),
                tap(resData => this.handleAuthentication(resData))
            );
    }

    login(email: string, password: string) {
        return this.httpClient.post<AuthResponseData>(this.signinUrl, {
            email: email,
            password: password,
            returnSecureToken: true
        })
            .pipe(
                catchError(errorRes => this.handleError(errorRes)),
                tap(resData => this.handleAuthentication(resData))
            );
    }

    autoLogin() {
        const userData: {
            email: string;
            id: string;
            _token: string;
            _tokenExpirationDate: string
        } = JSON.parse(localStorage.getItem('userData'));
        if (!userData) {
            return;
        }

        const loadedUser = new User(userData.email, userData.id, userData._token, new Date(userData._tokenExpirationDate));

        if (loadedUser.token) {
            this.user.next(loadedUser);

            const expirationDuration = new Date(userData._tokenExpirationDate).getTime() - new Date().getTime();

            this.autoLogout(expirationDuration);
        }
    }

    logout() {
        this.user.next(null);
        this.router.navigate(['/auth']);
        localStorage.removeItem('userData');

        if (this.tokenExpirationTimer) {
            clearTimeout(this.tokenExpirationTimer);
        }

        this.tokenExpirationTimer = null;
    }

    autoLogout(expirationDuration: number) {
        console.log(expirationDuration);
        this.tokenExpirationTimer =  setTimeout(() => {
            this.logout();
        }, expirationDuration);
    }

    private handleAuthentication(resData: AuthResponseData) {
        const expirationDate = new Date(new Date().getTime() + +resData.expiresIn * 1000);
        const user = new User(
            resData.email,
            resData.localId,
            resData.idToken,
            expirationDate
        );
        this.user.next(user);

        this.autoLogout(+resData.expiresIn * 1000);

        localStorage.setItem('userData', JSON.stringify(user));
    }

    private handleError(errorRes: HttpErrorResponse) {
        let errorMessage = 'An unknown error occurred!';

        if (!errorRes.error || !errorRes.error.error) {
            return throwError(() => new Error(errorMessage));
        }

        switch (errorRes.error.error.message) {
            case 'EMAIL_EXISTS':
                errorMessage = 'The email address is already in use by another account.';
                break;
            case 'OPERATION_NOT_ALLOWED':
                errorMessage = 'Password sign-in is disabled for this project.';
                break;
            case 'TOO_MANY_ATTEMPTS_TRY_LATER':
                errorMessage = 'Too many attempts. Try again later.';
                break;
            case 'INVALID_LOGIN_CREDENTIALS':
                errorMessage = 'Invalid Email or Password.';
                break;
        }

        return throwError(() => new Error(errorMessage));
    }
}