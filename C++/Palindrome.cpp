#include <iostream>
#include <string>
using namespace std;

void ispalindrome(int x)
{
    int remainder;
    int reverse = 0;
    int orignal = x;
    while (x != 0)
    {
        remainder = x % 10;
        reverse = reverse * 10 + remainder;
        x /= 10;
    }
    if (reverse == orignal)
    {
        cout << orignal << " it is " << endl;
    }
    else
    {
        cout << orignal << " it is not" << endl;
    }
}

void ispalindrome(string str){
    int left = 0, right = str.size() - 1;

    bool isPalindrome = true;
    while (left < right) {
        if (str[left] != str[right]) {
            isPalindrome = false;
            break;
        }
        right--;
        left++;
    }

    if(isPalindrome == true){
        cout << "it is a palindrome" << endl; 
    }else{
        cout << "it is not a palindrome"<< endl; 
    }
    
}

int main()
{
    ispalindrome(121);
    ispalindrome("1214");
    ispalindrome("abccba");
}
