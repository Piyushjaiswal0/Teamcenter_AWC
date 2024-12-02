#include <iostream>
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
        cout << orignal << " it is ";
    }
    else
    {
        cout << orignal << " it is not";
    }
}

int main()
{
    ispalindrome(121);
    ispalindrome(1214);
}
