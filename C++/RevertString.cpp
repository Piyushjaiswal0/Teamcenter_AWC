#include <iostream>
#include <string>
using namespace std;

int main()
{
    string s = "My name is piyush";
    string newstr = "";
    while (!s.empty())
    {
        int pos = s.find(" ");
        if (pos != string::npos)
        {
            newstr = s.substr(0, pos) + " " + newstr; // newstr = my + "" --> name my --> is name my
            s = s.substr(pos + 1, s.length());        // s = name is piyush --> is piyush --> piyush
        }
        else
        {
            newstr = s + " " + newstr;
            break;
        }
    }
    cout << "Reverse string: " << newstr;
}